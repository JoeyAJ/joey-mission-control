// Build a reviewable local CLI layout only; no deploy, secret, migration or network calls.
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),stage=await fs.mkdtemp('/tmp/mc-vm-link-deployment-');
const folder=path.join(stage,'supabase','functions','mc-worker-link-v1');await fs.mkdir(folder,{recursive:true,mode:0o700});
for(const part of ['edge','src','vendor'])await fs.cp(path.join(source,part),path.join(folder,part),{recursive:true});
await fs.writeFile(path.join(folder,'index.ts'),"// Reviewed 0.1.1 entry; full local import graph is included.\nimport './edge/index.ts';\n");
await fs.writeFile(path.join(stage,'supabase','config.toml'),'project_id = "scmvedfqwlhkyvljymjj"\n\n[functions.mc-worker-link-v1]\nverify_jwt = false\n');
await fs.mkdir(path.join(stage,'reviewed'),{mode:0o700});await fs.copyFile(path.join(source,'sql/mc-vm-link-0.1.1.reviewed.sql'),path.join(stage,'reviewed/mc-vm-link-0.1.1.sql'));
console.log(JSON.stringify({stage,networkCalls:0,deployed:false,migrationApplied:false,enabled:false}));
