import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const exec=promisify(execFile);
const data=JSON.parse(await fs.readFile(new URL('../../metadata/project-reconciliation.v03.json',import.meta.url),'utf8'));
const immutableGitSources=new Map();
async function gitBytes(repo,sha,file){const key=JSON.stringify([repo,sha,file]);if(!immutableGitSources.has(key))immutableGitSources.set(key,exec('git',['show',`${sha}:${file}`],{cwd:repo,encoding:'buffer',maxBuffer:4*1024*1024}).then(r=>r.stdout).catch(error=>{immutableGitSources.delete(key);throw error;}));return immutableGitSources.get(key);}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Registry roots only; immutable Git blobs and fingerprint-bound canonical files.
// Fail closed to missing history, never to a technical blocker or a completion claim.
export async function reconcileProject(root,chain){
 const baseline=data.projects[chain.id];
 if(!baseline)return null;
 const pending={projectId:chain.id,result:'AWAITING_JOEY_CONFIRMATION',sourceState:'SOURCE_UNAVAILABLE',invalidSources:[],evidence:[]};
 if(chain.storedHead!==baseline.baselineSha||path.basename(chain.localMaster||'')!==baseline.repository)return{...pending,invalidSources:['registry-baseline']};
 const cache=new Map(),evidence=[];
 for(const e of baseline.evidence){
  const key=JSON.stringify([e.sourceKind,e.path,e.sourceSha]);
  if(!cache.has(key)){
   try{
    if(path.isAbsolute(e.path)||e.path.split('/').includes('..'))throw new Error('Invalid source path');
    const bytes=e.sourceKind==='canonical'?await fs.readFile(path.join(root,e.path)):await gitBytes(chain.localMaster,e.sourceSha,e.path);
    cache.set(key,hash(bytes)===e.fingerprint);
   }catch{cache.set(key,false);}
  }
  if(!cache.get(key))pending.invalidSources.push(e.id);
  else evidence.push({...e,observedAt:new Date().toISOString()});
 }
 if(pending.invalidSources.length)return{...pending,sourceState:'SOURCE_CHANGED_OR_UNAVAILABLE'};
 return{...structuredClone(baseline),sourceState:'MATCHED',evidence};
}
