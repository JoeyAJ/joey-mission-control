import fs from 'node:fs/promises';
import path from 'node:path';
import { parseMarkdown } from './markdown.mjs';
import { sha256, sourceRef } from './fingerprint.mjs';
import { isStrictDateTime } from './date-time.mjs';

function field(text,name) {
  return text.match(new RegExp(`^${name}:\\s*(.+)$`,'mi'))?.[1]?.trim() || '';
}
function section(parsed,name) {
  return parsed.sections[name]?.replace(/^[-*]\s*/gm,'').trim() || '';
}
function contained(root,candidate) {
  const relative=path.relative(root,candidate);
  return relative==='' || (!path.isAbsolute(relative) && relative!=='..' && !relative.startsWith(`..${path.sep}`));
}
async function safeRealFile(root,file) {
  const stat=await fs.lstat(file);
  if(stat.isSymbolicLink()) throw new Error(`Handoff symlink rejected: ${file}`);
  const real=await fs.realpath(file);
  if(!contained(root,real)) throw new Error(`Handoff containment rejected: ${file}`);
  return real;
}

export function parseHandoff(text,sourcePath,knownEntities=null) {
  const parsed=parseMarkdown(text),raw=field(text,'Project');
  const entityId=(knownEntities?knownEntities.has(raw):/^[A-Z][A-Z0-9_-]+$/.test(raw))?raw:null;
  const timestamp=field(text,'Timestamp'),task=field(text,'Task'),status=field(text,'Status');
  const conflictReasons=[];
  if(!entityId)conflictReasons.push('Unknown or ambiguous entity');
  if(!isStrictDateTime(timestamp))conflictReasons.push('Missing or invalid timestamp');
  if(!task)conflictReasons.push('Missing task');
  if(!status)conflictReasons.push('Missing status');
  return {
    schemaVersion:'1.0',timestamp,entityId,task,status,
    executedBy:field(text,'Executed by')||field(text,'Agent'),model:field(text,'Model'),
    summary:section(parsed,'Summary'),changes:section(parsed,'Changes')||section(parsed,'Content'),verification:section(parsed,'Verification'),
    commit:(text.match(/Commit:\s*`([^`]+)`/i)||[])[1]||'',decisionRequired:section(parsed,'Decision Required'),
    nextAction:section(parsed,'Next Proposed Action')||section(parsed,'Next Action'),sourcePath,fingerprint:sha256(text),source:sourceRef(sourcePath,text,'Handoff',{as_of:timestamp}),conflict:conflictReasons.length>0,conflictReasons
  };
}

export async function loadHandoffs(dir,{knownEntities=null}={}) {
  const rootStat=await fs.lstat(dir);
  if(rootStat.isSymbolicLink()) throw new Error('Handoff root symlink rejected');
  const root=await fs.realpath(dir);
  const latestPath=path.join(dir,'LATEST.md');
  await safeRealFile(root,latestPath);
  const globalLatest=parseHandoff(await fs.readFile(latestPath,'utf8'),latestPath,knownEntities);
  const historyDir=path.join(dir,'HISTORY');
  let names=[];
  try {
    const historyStat=await fs.lstat(historyDir);
    if(historyStat.isSymbolicLink()) throw new Error('Handoff HISTORY symlink rejected');
    const realHistory=await fs.realpath(historyDir);
    if(!contained(root,realHistory)) throw new Error('Handoff HISTORY containment rejected');
    names=await fs.readdir(historyDir);
  } catch(error) {
    if(error.code!=='ENOENT') throw error;
  }
  const history=[];
  for(const name of names.filter(name=>name.endsWith('.md')).sort()) {
    const file=path.join(historyDir,name);
    await safeRealFile(root,file);
    history.push(parseHandoff(await fs.readFile(file,'utf8'),file,knownEntities));
  }
  const byEntity={},conflictsByEntity={};
  for(const handoff of [...history,globalLatest])if(handoff.entityId&&handoff.conflict)(conflictsByEntity[handoff.entityId]||=[]).push(handoff);
  for(const handoff of history.filter(item=>item.entityId&&!item.conflict).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp))) byEntity[handoff.entityId]=handoff;
  if(globalLatest.entityId&&!globalLatest.conflict){const current=byEntity[globalLatest.entityId];if(!current||Date.parse(globalLatest.timestamp)>=Date.parse(current.timestamp))byEntity[globalLatest.entityId]=globalLatest;}
  return {globalLatest,history,byEntity,conflictsByEntity};
}
