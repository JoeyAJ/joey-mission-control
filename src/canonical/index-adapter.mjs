import fs from 'node:fs/promises';
import path from 'node:path';
import { parseMarkdown, parseTable, links } from './markdown.mjs';
import { sourceRef } from './fingerprint.mjs';

export async function resolveCanonicalPath(root,candidate){
  const realRoot=await fs.realpath(root);
  const absolute=path.isAbsolute(candidate)?candidate:path.resolve(root,candidate);
  let real;
  try{real=await fs.realpath(absolute);}catch{real=path.resolve(absolute);}
  if(real!==realRoot&&!real.startsWith(realRoot+path.sep))throw new Error('Path escapes canonical root');
  return real;
}

function cleanLink(link){return link?.replace(/^\.\//,'');}
function entityFromMemory(memoryPath,entityType,name,localMaster){
  const parts=memoryPath.split('/').filter(Boolean);
  const casesIndex=parts.indexOf('CASES');
  const typeIndex=parts.findIndex(part=>part==='PROJECTS'||part==='SYSTEMS');
  const id=casesIndex>=0?parts[casesIndex+1]:parts[typeIndex+1];
  const parentId=casesIndex>=0?parts[parts.indexOf('SYSTEMS')+1]:undefined;
  return {id,name,entityType,parentId,memoryPath,currentStatePath:undefined,localMaster};
}
function explicitId(label){return label.match(/`([A-Z][A-Z0-9_-]+)`/)?.[1];}

export async function loadMemoryIndex(root){
  const file=await resolveCanonicalPath(root,'MEMORY_INDEX.md');
  const text=await fs.readFile(file,'utf8');
  const parsed=parseMarkdown(text),entities=[];
  for(const [section,entityType,label] of [['Production Development Registry','project','Project'],['Systems Registry','system','System']]){
    for(const row of parseTable(parsed.sections[section])){
      const memoryPath=cleanLink(links(row.Memory)[0]?.path);
      if(!memoryPath)continue;
      const entity=entityFromMemory(memoryPath,entityType,row[label].replace(/\s*\(`[^`]+`\)\s*$/,''),row['Canonical Local Master'].replace(/`/g,''));
      entity.id=explicitId(row[label])||entity.id;
      entity.currentStatePath=cleanLink(links(row['Current State'])[0]?.path);
      entities.push(entity);
    }
  }
  const aliases={};
  for(const line of text.split('\n')){
    const command=line.match(/^- `([^`]+)`/)?.[1];
    if(!command)continue;
    const link=links(line)[0];
    const direct=line.match(/→\s*`([A-Z][A-Z0-9_-]+)`/)?.[1];
    const existing=line.match(/existing `([A-Z][A-Z0-9_-]+)`/)?.[1];
    let target=direct||existing||link?.label?.replace(/`/g,'');
    if(link?.path&&/\/CASES\//.test(link.path)){
      const memoryPath=cleanLink(link.path);
      const caseEntity=entityFromMemory(memoryPath,'case',target,undefined);
      if(!entities.some(entity=>entity.id===caseEntity.id))entities.push(caseEntity);
      target=caseEntity.id;
    }
    if(target)aliases[command]=target;
  }
  for(const [command,target] of Object.entries(aliases)){
    const entity=entities.find(item=>item.entityType!=='case'&&command.toLowerCase().includes(item.name.toLowerCase()));
    if(entity&&/^[A-Z][A-Z0-9_-]+$/.test(target))entity.id=target;
  }
  return {metadata:parsed.metadata,entities,aliases,source:sourceRef(file,text,'Memory Index',parsed.metadata)};
}
