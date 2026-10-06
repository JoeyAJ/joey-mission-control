// Authored synthetic sources only. No workstation data is copied or consulted.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'mc-portable-'));
export const canonicalRoot=path.join(fixtureRoot,'canonical');
export const dataRoot=path.join(fixtureRoot,'local-data');
export const catalogRoot=path.join(fixtureRoot,'catalog-registered');
export const catalogBeforeRoot=path.join(fixtureRoot,'catalog-planned');
export const reconciliationMetadata=JSON.parse(fs.readFileSync(new URL('../../metadata/project-reconciliation.v03.json',import.meta.url),'utf8'));
export const languageMetadata=JSON.parse(fs.readFileSync(new URL('../../metadata/product-language.v03.json',import.meta.url),'utf8'));
const write=(root,file,bytes)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),bytes);};
const digest=b=>createHash('sha256').update(b).digest('hex');
export const chains={};
let index='# Synthetic Memory Index\n',registry='# Synthetic Registry\n';
const rows={project:[],system:[]};
const urls={NEXAEON:'https://nexaeon-web.vercel.app/',WOOSONG_BUDDY:'https://woosong-buddy-app.vercel.app/',NAMYOUNG_WEB3D:'https://namyoung-web3d.vercel.app/'};
for(const [i,[id,b]] of Object.entries(reconciliationMetadata.projects).entries()){
 const dir=id==='JOEY_ASSET_SYSTEM'?'SYSTEMS/JOEY_ASSET_SYSTEM':`PROJECTS/${id==='NAMYOUNG_WEB3D'?'NAMYOUNG':id}`;
 const repo=path.join(fixtureRoot,'repos',b.repository);
 fs.mkdirSync(repo,{recursive:true});
 const stage=id==='JOEY_ASSET_SYSTEM'?'Characterization test; phase 2 has not started':'Building synthetic fixture';
 for(const file of ['PROJECT_MEMORY','CURRENT_STATE','NEXT_ACTIONS','ARCHITECTURE','DECISIONS'])write(canonicalRoot,`${dir}/${file}.md`,`# Synthetic ${id} ${file}\n## Purpose\nSynthetic fixture purpose only.\n## Current Stage\n${stage}\n## Recommended Next Step\nReview synthetic fixture.\n`);
 for(const e of b.evidence){const root=e.sourceKind==='canonical'?canonicalRoot:repo;if(!fs.existsSync(path.join(root,e.path)))write(root,e.path,`# Synthetic source ${id}\nProject: ${id}\nTimestamp: 2026-10-06T00:00:00Z\nTask: Synthetic evidence task\nStatus: SUCCESS\n## Summary\nFixture evidence for ${e.path}.\n`);}
 write(repo,'fixture.txt',`Synthetic workspace ${id}\n`);
 const git=args=>execFileSync('git',args,{cwd:repo,env:{...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'},encoding:'utf8'}).trim();
 git(['init','-b','main']);git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','Synthetic fixture baseline']);
 const sha=git(['rev-parse','HEAD']);b.baselineSha=sha;
 chains[id]={id,storedHead:sha,localMaster:repo};
 for(const e of b.evidence){if(e.sourceKind!=='canonical')e.sourceSha=sha;e.fingerprint=digest(fs.readFileSync(path.join(e.sourceKind==='canonical'?canonicalRoot:repo,e.path)));}
 const l=languageMetadata.projects[id];l.purposeFingerprint=digest(fs.readFileSync(path.join(canonicalRoot,dir,'PROJECT_MEMORY.md')));l.stageFingerprint=digest(fs.readFileSync(path.join(canonicalRoot,dir,'CURRENT_STATE.md')));l.nextFingerprint=digest(fs.readFileSync(path.join(canonicalRoot,dir,'NEXT_ACTIONS.md')));
 const type=id==='JOEY_ASSET_SYSTEM'?'system':'project';rows[type].push(`| ${id} (\`${id}\`) | [M](${dir}/PROJECT_MEMORY.md) | [S](${dir}/CURRENT_STATE.md) | \`${repo}\` |`);
 registry+=`### ${i+1}. ${id}\n\n\`\`\`yaml\n${type}_id: ${id}\nlocal_master: ${repo}\nbranch: main\nlocal_head: ${sha}\ngithub_main_head: ${sha}\nproduction_source_sha: ${sha}\nproduction: ${type==='system'?'null':urls[id]}\n\`\`\`\n`;
}
for(const [type,title,label] of [['project','Production Development Registry','Project'],['system','Systems Registry','System']])index+=`## ${title}\n| ${label} | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n${rows[type].join('\n')}\n`;
const caseDir='SYSTEMS/JOEY_ASSET_SYSTEM/CASES/CASE_001_NAMYOUNG';
index+=`- \`進入 Namyoung Web3D\` → \`NAMYOUNG_WEB3D\`\n- \`enter case\` → [\`CASE_001_NAMYOUNG\`](${caseDir}/CASE_MEMORY.md)\n`;
registry+=`### System Cases\n| Case | Role | Canonical Memory | Source Location |\n|---|---|---|---|\n| \`CASE_001_NAMYOUNG\` | Origin | [M](${caseDir}/) | cases/CASE_001_NAMYOUNG/ |\n`;
write(canonicalRoot,'MEMORY_INDEX.md',index);write(canonicalRoot,'PROJECT_REGISTRY_V1.0.md',registry);
write(canonicalRoot,`${caseDir}/CURRENT_STATE.md`,'# Synthetic case\n## Current Stage\nphase_1_characterized_published\n');write(canonicalRoot,`${caseDir}/NEXT_ACTIONS.md`,'# Synthetic next\n## Recommended Next Step\nPreserve the published Phase 1 fixture.\n');
write(canonicalRoot,'HANDOFF/LATEST.md','# Synthetic handoff\nProject: NEXAEON\nTimestamp: 2026-10-06T00:00:00Z\nTask: Synthetic task\nStatus: SUCCESS\n## Summary\nSynthetic completion\n');fs.mkdirSync(path.join(canonicalRoot,'HANDOFF/HISTORY'),{recursive:true});
for(const [root,registered] of [[catalogBeforeRoot,false],[catalogRoot,true]]){
 const system_id='JOEY_ASSET_SYSTEM';
 write(root,'catalog/industries.json',JSON.stringify({schema:'joey-asset-system.classification.v1',system_id,acceptance:{status:'accepted'},planning:{asset_records_created:registered},industries:[{industry_id:'education',display_name:'教育／大學行政',status:'planned',description:'Synthetic education'},{industry_id:'construction-engineering',display_name:'Construction',status:'active',description:'Synthetic construction'}]}));
 const asset={asset_id:'construction.proxy',display_name:'Synthetic proxy',asset_kind:'prototype',usage_status:'test',applicable_industry_ids:['construction-engineering'],case_refs:['CASE_001_NAMYOUNG'],capability_status:'bounding_box_proxy_only',verification_status:'characterized',source_ref:{sha256:'a'.repeat(64)}};
 write(root,'catalog/assets.json',JSON.stringify({schema:'joey-asset-system.asset-index.v1',system_id,assets:[asset,...registered?[{...asset,asset_id:'education.university_lifecycle',applicable_industry_ids:['education'],case_refs:[],capability_status:'planned'}]:[]]}));
 write(root,'cases/CASE_001_NAMYOUNG/classification.json',JSON.stringify({schema:'joey-asset-system.case-classification.v1',system_id,case_id:'CASE_001_NAMYOUNG',client:{display_name:'Synthetic'},case_role:'origin',usage_status:'test',applicable_industry_ids:['construction-engineering'],origin_prototype_id:'synthetic',recovered_version:'fixture'}));
}
process.env.MC_CANONICAL_ROOT=canonicalRoot;process.env.MC_DATA_ROOT=dataRoot;process.env.MC_ASSET_CATALOG_ROOT=catalogRoot;
process.on('exit',()=>fs.rmSync(fixtureRoot,{recursive:true,force:true}));
