// One explicit invocation. No hook, daemon, glob, content upload or terminal capture.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {REPORT_VERSION_V3,MAX_ACTIVITY_FILE_BYTES,safeActivityPath} from '../src/reporting/file-activity.mjs';
const fail=code=>{throw Object.assign(Error(code),{code});};
export function prepareFileActivity({report,filePath,action,eventId,git,now=Date.now,cwd=process.cwd()}={}){
 if(report.schemaVersion!==REPORT_VERSION_V3||!report.activityPaths.includes(filePath)||!safeActivityPath(filePath)||!['read','changed'].includes(action)||report.events.some(e=>['completed','failed'].includes(e.kind)))fail('FILE_ACTIVITY_OPT_IN_REQUIRED');
 const root=fs.realpathSync(cwd);if(git(['rev-parse','--show-toplevel'])!==root)fail('FILE_ACTIVITY_CHECKOUT_REQUIRED');
 if(git(['symbolic-ref','--short','HEAD'])!==report.workRef)fail('FILE_ACTIVITY_WORK_REF_CONFLICT');
 // Git argument boundaries and exact task manifest prevent arbitrary file reads.
 try{git(['ls-files','--error-unmatch','--',filePath]);}catch{fail('FILE_ACTIVITY_TRACKED_FILE_REQUIRED');}
 let file=root;for(const component of filePath.split('/')){file=path.join(file,component);if(fs.lstatSync(file).isSymbolicLink())fail('FILE_ACTIVITY_SYMLINK_DENIED');}
 const stat=fs.lstatSync(file);if(!stat.isFile()||stat.nlink!==1||stat.size>MAX_ACTIVITY_FILE_BYTES||path.relative(root,fs.realpathSync(file))!==filePath)fail('FILE_ACTIVITY_FILE_DENIED');
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let bytes;
 try{const opened=fs.fstatSync(fd);if(opened.ino!==stat.ino||opened.dev!==stat.dev||opened.nlink!==1||opened.size>MAX_ACTIVITY_FILE_BYTES)fail('FILE_ACTIVITY_FILE_CHANGED');const buffer=Buffer.alloc(MAX_ACTIVITY_FILE_BYTES+1),n=fs.readSync(fd,buffer,0,buffer.length,0);if(n>MAX_ACTIVITY_FILE_BYTES)fail('FILE_ACTIVITY_TOO_LARGE');bytes=buffer.subarray(0,n);const after=fs.fstatSync(fd);if(after.size!==n||after.mtimeMs!==opened.mtimeMs||after.ctimeMs!==opened.ctimeMs)fail('FILE_ACTIVITY_FILE_CHANGED');}finally{fs.closeSync(fd);}
 if(path.relative(root,fs.realpathSync(file))!==filePath)fail('FILE_ACTIVITY_FILE_CHANGED');let current=root;for(const component of filePath.split('/')){current=path.join(current,component);if(fs.lstatSync(current).isSymbolicLink())fail('FILE_ACTIVITY_SYMLINK_DENIED');}
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('FILE_ACTIVITY_TEXT_ONLY');}
 // Refuse credential-shaped values before even their fingerprints are reported.
 if(text.includes('\0')||/-----BEGIN[^\n]*PRIVATE KEY|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})|\bBearer\s+[A-Za-z0-9_.-]{20,}|\b(?:password|secret|token|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9_./+-]{20,}|https?:\/\/[^\s/]*:[^\s/]*@/i.test(text))fail('FILE_ACTIVITY_SENSITIVE_CONTENT');
 const contentSha256=createHash('sha256').update(bytes).digest('hex'),prior=report.events.filter(e=>e.activity?.path===filePath).at(-1)?.activity;
 if(action==='changed'&&(!prior||prior.contentSha256===contentSha256))fail('FILE_ACTIVITY_CHANGE_LINEAGE_REQUIRED');
 const at=new Date(now()).toISOString();
 return{id:eventId,sequence:report.events.at(-1).sequence+1,eventAt:at,kind:'progress',summary:(action==='read'?'Reporter bounded read':'Reported observed digest change')+' · '+filePath+' · metadata only',result:null,delivery:null,activity:{schemaVersion:'mc.file-activity.v1',qualification:'AGENT_REPORTED_METADATA',scope:Object.fromEntries(['projectId','track','repositoryId','runId','taskId','workRef'].map(k=>[k,report[k]])),actor:report.agentName,action:action==='read'?'FILE_READ':'FILE_CHANGED',path:filePath,contentSha256,previousContentSha256:action==='changed'?prior.contentSha256:null,byteLength:bytes.length,workHeadSha:git(['rev-parse','HEAD']),observedAt:at,precision:action==='read'?'REPORTER_BOUNDED_READ':'OBSERVED_DIGEST_CHANGE'}};
}
