import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshotFiles=['deployment/production-snapshot.json','deployment/project-state.v03b.json','deployment/last-development.v03d.json','deployment/public-cases.v03e.json'];
const projectIds=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'];
const exactSet=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&new Set(actual).size===expected.length&&expected.every(x=>actual.includes(x));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(message);};
export async function checkMigrationLayers({repoRoot=root,matrix}={}){
 matrix??=JSON.parse(await fs.readFile(path.join(repoRoot,'metadata/mc-dependency-matrix.json'),'utf8'));
 if(matrix.receiptFile!=='deployment/command-source-readouts.json'||!exactSet(matrix.publicSnapshotLayers?.map(s=>s.file),snapshotFiles)||!exactSet(matrix.projects?.map(p=>p.projectId),projectIds))fail('Unsafe or incomplete source layer manifest');
 const checks=[];
 for(const layer of matrix.publicSnapshotLayers){const bytes=await fs.readFile(path.join(repoRoot,layer.file));if(sha(bytes)!==layer.sha256)fail('Accepted snapshot hash drift: '+layer.file);checks.push({source:layer.file,status:'HASH_VERIFIED',role:layer.role});}
 const bytes=await fs.readFile(path.join(repoRoot,matrix.receiptFile));if(sha(bytes)!==matrix.receiptSha256)fail('Receipt source hash drift');const receipt=JSON.parse(bytes);
 if(!exactSet(receipt.projects?.map(p=>p.projectId),projectIds))fail('Unsafe or incomplete receipt project set');
 if(receipt.readoutVersion!==matrix.receiptVersion||receipt.schemaVersion!==2)fail('Receipt version binding mismatch');
 for(const p of matrix.projects){const r=receipt.projects.find(r=>r.projectId===p.projectId);if(!r||r.repository!==p.canonicalRepository||r.branch!==p.branch||r.verifiedRemoteSha!==p.latestVerifiedSha||r.syncMode!=='FIXED_RECEIPT_REREAD'||r.currentAgent!==null||r.currentTask!==null||r.runtimeConnected!==false)fail('Project source/authority binding mismatch: '+p.projectId);}
 const a=matrix.privateAuthority;if(!a||a.canonicalMemory!=='NOT_RESTORED_IN_THIS_CLOUD'||a.ownerLedger!=='MAC_AUTHORITY_NOT_MIGRATED'||a.continuousSync!=='NOT_CONNECTED'||a.newPrivateWritesAllowed!==false||a.agentControlAllowed!==false||a.crossProjectSyncAllowed!==false)fail('Private authority migration gate is not established');
 const snapshot=JSON.parse(await fs.readFile(path.join(repoRoot,snapshotFiles[0]),'utf8'));
 const presentationDrift=[];for(const p of matrix.projects){const original=snapshot.projects.find(r=>r.id===p.projectId)?.where?.storedCommit?.value;if(original&&original!==p.latestVerifiedSha)presentationDrift.push({projectId:p.projectId,snapshotBaseline:original,receiptTip:p.latestVerifiedSha,status:'VERSIONED_PRESENTATION_NO_AUTO_PROMOTION'});}
 return {sourceLayers:checks,receiptVersion:receipt.readoutVersion,receiptIntegrity:'HASH_AND_FIELD_BINDINGS_VERIFIED',presentationDrift,privateAuthority:'MIGRATION_PENDING',dependentWrites:'BLOCKED',sync:'FIXED_REREAD_NOT_LIVE',phaseP0:'PARTIAL'};
}
export async function checkRemoteTips(projects,readRemote){
 const result=[];for(const p of projects){if(!/^JoeyAJ\/[A-Za-z0-9_-]+$/.test(p.canonicalRepository)||!/^[-A-Za-z0-9_./]+$/.test(p.branch)||p.branch.includes('..')||!/^[a-f0-9]{40}$/.test(p.latestVerifiedSha))fail('Unsafe remote source specification');
 const output=await readRemote('https://github.com/'+p.canonicalRepository+'.git','refs/heads/'+p.branch);const lines=output.trim().split('\n');const fields=lines[0]?.split(/\s+/);const current=lines.length===1&&fields[1]==='refs/heads/'+p.branch&&/^[a-f0-9]{40}$/.test(fields[0])?fields[0]:null;
 result.push({projectId:p.projectId,branch:p.branch,expected:p.latestVerifiedSha,observed:current,status:current===p.latestVerifiedSha?'TIP_VERIFIED':current?'DRIFT':'UNAVAILABLE'});
 }return result;
}
async function main(){
 const args=process.argv.slice(2);if(args.some(a=>a!=='--remote'))fail('Usage: npm run check:migration -- [--remote]');
 const matrix=JSON.parse(await fs.readFile(path.join(root,'metadata/mc-dependency-matrix.json'),'utf8')),result=await checkMigrationLayers({matrix});result.checkedAt=new Date().toISOString();
 if(args.includes('--remote')){result.remoteTips=await checkRemoteTips(matrix.projects,(url,ref)=>execFileSync('git',['ls-remote',url,ref],{cwd:root,encoding:'utf8',timeout:20000}));if(result.remoteTips.some(r=>r.status!=='TIP_VERIFIED'))process.exitCode=1;}
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
