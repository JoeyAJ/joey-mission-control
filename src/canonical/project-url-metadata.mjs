import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {sha256} from './fingerprint.mjs';
import {loadSchema,validate} from '../api/validation.mjs';
import {safeProjectUrl} from '../../public/project-links.js';
const file=new URL('../../metadata/project-urls.v1.json',import.meta.url);
export async function loadProjectUrls(){
 const text=await fs.readFile(file,'utf8'),data=JSON.parse(text),validation=validate(await loadSchema('project-urls'),data);
 if(!validation.valid)throw new Error('Invalid project URL metadata: '+validation.errors.join('; '));
 const ids=new Set();
 for(const project of data.projects){
  if(ids.has(project.entityId))throw new Error('Duplicate project URL entity');ids.add(project.entityId);
  const primaryTypes=new Set();
  for(const entry of project.entries){
   if(!safeProjectUrl(entry.url))throw new Error('Unsafe project URL metadata');
   if(['canonical_production','current_application'].includes(entry.type)){if(primaryTypes.has(entry.type))throw new Error('Duplicate primary URL type');primaryTypes.add(entry.type);}
  }
  if(project.canonicalProductionStatus==='not_established'&&primaryTypes.has('canonical_production'))throw new Error('Unestablished canonical production cannot have a production URL');
 }
 return {...data,source:{authority:data.authority,sourcePath:fileURLToPath(file),sourceSection:'Joey confirmed project URL metadata',fingerprint:sha256(text),verificationStatus:'joey_confirmed_url',readAt:new Date().toISOString()}};
}
export function resolveProjectUrls(id,registry,metadata){
 const project=metadata.projects.find(item=>item.entityId===id);
 if(!project)return{canonicalProductionStatus:'not_recorded',entries:[],source:null,issues:[]};
 const issues=[];
 const entries=project.entries.filter(entry=>{
  if(entry.type==='canonical_production'&&entry.url!==registry.production){issues.push('Canonical production URL differs from Registry; navigation suppressed');return false;}
  return true;
 });
 return {canonicalProductionStatus:project.canonicalProductionStatus,entries,source:metadata.source||null,issues};
}

// Overlay Joey-confirmed URL metadata on a published snapshot's project links (snapshot bytes stay unchanged).
export function applyProjectUrls(snapshot,metadata){for(const p of snapshot.projects){const r=resolveProjectUrls(p.id,{production:p.where?.production?.value},metadata);const entries=r.entries.filter(e=>safeProjectUrl(e.url)&&e.urlVerification==='joey_confirmed');if(entries.length)p.projectUrls={...p.projectUrls,canonicalProductionStatus:r.canonicalProductionStatus,entries};}return snapshot;}
