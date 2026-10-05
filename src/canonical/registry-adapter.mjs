import fs from 'node:fs/promises';
import { resolveCanonicalPath } from './index-adapter.mjs';
import { parseMarkdown, parseTable, links } from './markdown.mjs';
import { sourceRef } from './fingerprint.mjs';

function blocks(text){return [...text.matchAll(/^###\s+\d+\.\s+(.+)\n\n```yaml\n([\s\S]*?)```/gm)].map(match=>({name:match[1],yaml:match[2]}));}
function yaml(text){return Object.fromEntries(text.split('\n').map(line=>line.match(/^([\w_]+):\s*(.*)$/)).filter(Boolean).map(match=>[match[1],match[2]==='null'?null:match[2]]));}
function subsection(text,heading){const marker=`### ${heading}`;const start=text.indexOf(marker);if(start<0)return'';const body=text.slice(start+marker.length).replace(/^\s*/,'');const offsets=[body.indexOf('\n### '),body.indexOf('\n## ')].filter(index=>index>=0);return offsets.length?body.slice(0,Math.min(...offsets)):body;}

export async function loadRegistry(root){
  const file=await resolveCanonicalPath(root,'PROJECT_REGISTRY_V1.0.md');
  const text=await fs.readFile(file,'utf8'),parsed=parseMarkdown(text),production=[],systems=[];
  for(const block of blocks(text)){
    const data=yaml(block.yaml);
    const id=data.project_id||data.system_id;
    if(!id)continue;
    const item={id,name:block.name,localMaster:data.local_master,github:data.github,branch:data.branch,storedHead:data.local_head,githubHead:data.github_main_head,productionHead:data.production_source_sha,production:data.production,alignment:data.alignment,source:sourceRef(file,text,block.name,parsed.metadata)};
    (data.project_id?production:systems).push(item);
  }
  const cases=[];
  for(const row of parseTable(subsection(text, 'System Cases'))){
    const id=row.Case?.match(/`([A-Z][A-Z0-9_-]+)`/)?.[1];
    const memoryPath=links(row['Canonical Memory'])[0]?.path?.replace(/^\.\//,'');
    if(!id||!memoryPath)continue;
    const parts=memoryPath.split('/').filter(Boolean);
    const systemsIndex=parts.indexOf('SYSTEMS');
    const casesIndex=parts.indexOf('CASES');
    if(systemsIndex<0||casesIndex<0)continue;
    cases.push({id,parentId:parts[systemsIndex+1],entityType:'case',memoryPath});
  }
  return {production,systems,cases,source:sourceRef(file,text,'Registry',parsed.metadata)};
}
