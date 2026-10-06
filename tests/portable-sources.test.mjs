import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {canonicalRoot,catalogRoot,catalogBeforeRoot,reconciliationMetadata,chains,dataRoot} from './helpers/fixtures.mjs';
import {reconcileProject} from '../src/product/reconciliation.mjs';
import {readAssetCatalog} from '../src/proposals/asset-catalog.mjs';
import {createDefaultDeps} from '../src/server.mjs';
test('injected catalog roots select planned/registered sources while read-only state creates no owner or sessions',async()=>{
 const deps=createDefaultDeps({canonicalRoot,dataRoot,assetCatalogRoot:catalogBeforeRoot});await deps.ready;
 assert.equal((await deps.getAssetCatalog()).educationImplemented,false);
 assert.equal((await createDefaultDeps({canonicalRoot,dataRoot,assetCatalogRoot:catalogRoot}).getAssetCatalog()).educationImplemented,true);
 await deps.getState({readOnly:true});
 await assert.rejects(fs.access(path.join(dataRoot,'product-owner.v03.json')),{code:'ENOENT'});
 await assert.rejects(fs.access(path.join(dataRoot,'sessions.v1.json')),{code:'ENOENT'});
});
test('synthetic reconciliation binds actual immutable Git bytes and rejects altered hashes, unsafe paths and registry drift',async()=>{
 const id='NEXAEON',metadata=structuredClone(reconciliationMetadata),chain=chains[id];
 assert.equal((await reconcileProject(canonicalRoot,chain,{metadata})).sourceState,'MATCHED');
 const e=metadata.projects[id].evidence.find(e=>e.sourceKind!=='canonical');assert.ok(e);
 assert.ok(execFileSync('git',['show',`${e.sourceSha}:${e.path}`],{cwd:chain.localMaster}).length);
 e.fingerprint='0'.repeat(64);assert.equal((await reconcileProject(canonicalRoot,chain,{metadata})).sourceState,'SOURCE_CHANGED_OR_UNAVAILABLE');
 e.path='../escape';assert.deepEqual((await reconcileProject(canonicalRoot,chain,{metadata})).evidence,[]);
 assert.equal((await reconcileProject(canonicalRoot,{...chain,localMaster:path.dirname(chain.localMaster)},{metadata})).sourceState,'SOURCE_UNAVAILABLE');
});
test('catalog source symlinks fail closed even when their destination is readable',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mc-catalog-link-'));
 try{await fs.cp(catalogRoot,root,{recursive:true});const file=path.join(root,'catalog/assets.json');await fs.unlink(file);await fs.symlink(path.join(catalogRoot,'catalog/assets.json'),file);await assert.rejects(readAssetCatalog(root),/Unsafe/);}finally{await fs.rm(root,{recursive:true,force:true});}
});
