import {release} from '../src/release.mjs';
import {assertProjectState} from '../src/project-state/model.mjs';
import {publicProjectState} from '../src/project-state/public-state.mjs';
import {migrateProduct} from '../src/project-state/adapter.mjs';
import {deriveProjectSummary} from '../public/project-state.js';
import {productView} from '../src/product/view.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {manifest} from '../src/agent/control.mjs';
import {validate,loadSchema} from '../src/api/validation.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname);
async function files(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())out.push(...await files(f));else out.push(f);}return out;}
for(const dir of ['src','public','api'])for(const f of await files(path.join(root,dir)))if(/\.(mjs|js)$/.test(f)){const check=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(check.status!==0)throw new Error(check.stderr);}
const snapshot=JSON.parse(await fs.readFile(path.join(root,'deployment/production-snapshot.json'),'utf8'));
const runtimeSchema=await loadSchema('project-runtime'),activitySchema=await loadSchema('agent-activity'),productSchema=await loadSchema('project-product');
for(const p of snapshot.projects){const m=manifest(p,{handoff:snapshot.handoffs.byEntity[p.id],handoffs:snapshot.handoffs.history,generatedAt:snapshot.generatedAt});for(const [schema,value] of [[productSchema,productView(p,{runtime:m.runtime})],[runtimeSchema,m.runtime],...m.activity.map(a=>[activitySchema,a])]){const result=validate(schema,value);if(!result.valid)throw new Error(result.errors.join(', '));}}
for(const p of snapshot.projects)deriveProjectSummary(migrateProduct(productView(p)));
const published=JSON.parse(await fs.readFile(path.join(root,'deployment/project-state.v03b.json'),'utf8'));
if(published.projects.length!==snapshot.projects.length)throw new Error('Release project count mismatch');
for(const p of snapshot.projects){const state=published.projects.find(s=>s.id===p.id);assertProjectState(state);publicProjectState(state);deriveProjectSummary(state);}
const dest=path.join(root,'dist');await fs.mkdir(dest,{recursive:true});await fs.cp(path.join(root,'public'),path.join(dest,'public'),{recursive:true});
await fs.writeFile(path.join(dest,'build.json'),JSON.stringify({version:release.version,baseline:release.parentBaseline,acceptance:release.joeyAcceptance,deployAuthorized:true},null,2));
console.log('V0.3 static bundle, module syntax and runtime/activity/product/canonical schemas verified. No deployment performed.');
