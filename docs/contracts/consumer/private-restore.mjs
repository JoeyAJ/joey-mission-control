// Authorized read-only staging. Never imported by the production adapter/server.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadTwoLedgersReadonly} from './ledger-only.mjs';
import {importProducerReadonly,compareAuthorityLayers} from './producer-reader.mjs';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const files={
 'product-owner.v03.json':{bytes:179558,sha256:'c2a158f0a9cf2182167f49838bcaf6d3c67984dc36d3dc8105ade7c8287f3072'},
 'inbox.v1.json':{bytes:2,sha256:'4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945'},
 'mc-canonical-context.filtered.v1.json':{bytes:22486,sha256:'5d34aa9ffb9bbb5cc1d2a3de54c13faeb128f04f9d972391ee9abb230e593988'},
 'schema-contract.json':{bytes:13319,sha256:'4eb25412864482bbebcfeb5e9a583d8fa4405b887426fdda62b69c914def00fc'}
};
export async function readPrivateRestore({root,readAt}){
 if(!path.isAbsolute(root))throw Error('Explicit external staging root required');
 const actual=await fs.realpath(root),relative=path.relative(repo,actual);
 if(!relative.startsWith('..'+path.sep)&&relative!=='..')throw Error('Private staging must remain outside product repo');
 const roots={ledger:path.join(actual,'staging/MC_private_operational_restore_20261007'),context:path.join(actual,'staging/MC_private_filtered_context_restore_20261007')};
 const read=async(dir,name)=>{const p=path.join(dir,name);if((await fs.lstat(p)).isSymbolicLink()||await fs.realpath(p)!==p)throw Error('Private staging symlink rejected');return fs.readFile(p);};
 const bytes={};let manifestVerified=0;
 for(const [kind,dir]of Object.entries(roots)){
  const m=JSON.parse(await read(dir,'manifest.json')),names=kind==='ledger'?['product-owner.v03.json','inbox.v1.json']:['mc-canonical-context.filtered.v1.json','schema-contract.json'];
  if(!Array.isArray(m.files)||m.files.length!==2||new Set(m.files.map(f=>f.filename)).size!==2)throw Error('Exact restore manifest scope required');
  for(const name of names){const expected=files[name],entry=m.files.find(f=>f.filename===name),b=await read(dir,name);if(!entry||entry.bytes!==expected.bytes||entry.sha256!==expected.sha256||b.length!==expected.bytes||hash(b)!==expected.sha256)throw Error('Private restore integrity mismatch');bytes[name]=b;manifestVerified++;}
 }
 const ledger=loadTwoLedgersReadonly({ownerBytes:bytes['product-owner.v03.json'],inboxBytes:bytes['inbox.v1.json'],expected:files,verifiedCustody:true});
 const restored=await importProducerReadonly({contextBytes:bytes['mc-canonical-context.filtered.v1.json'],schema:JSON.parse(bytes['schema-contract.json']).schema,expectedContextHash:files['mc-canonical-context.filtered.v1.json'].sha256,expectedContextBytes:22486,ledgerRestore:ledger,verifiedCustody:true,readAt});
 const snapshot=JSON.parse(await fs.readFile(new URL('../../../deployment/production-snapshot.json',import.meta.url))),safe=JSON.parse(await fs.readFile(new URL('../../../deployment/command-source-readouts.json',import.meta.url)));
 return {restored,ledger,receipt:{readOnly:true,manifestVerified,projectCount:restored.views.length,ownerCounts:ledger.counts,inboxCount:ledger.inboxCount,readAt,extractedAt:restored.extractedAt,authorityCutover:false,runtimeConnected:false,authorityLayers:compareAuthorityLayers(restored,{publicSnapshot:snapshot,safeReceipts:safe})}};
}
