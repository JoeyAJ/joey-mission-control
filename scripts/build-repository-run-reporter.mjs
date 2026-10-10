import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const r=await build({entryPoints:['scripts/report-repository-run.mjs'],bundle:true,platform:'node',format:'esm',target:['node22'],minify:true,write:false,sourcemap:false,legalComments:'none',metafile:true});
if(Object.keys(r.metafile.inputs).some(p=>/server|allowlist|owner-auth|snapshots/.test(p)))throw Error('PRIVATE_CONFIG_IN_REPORTER');const source=r.outputFiles[0].text,sha=createHash('sha256').update(source).digest('hex');
await fs.writeFile('public/repository-run-reporter-source.js','// Generic executable reporter source; contains no private source, credential or configuration.\nexport const repositoryRunReporterSource='+JSON.stringify(source)+';\nexport const repositoryRunReporterSha256='+JSON.stringify(sha)+';\n');console.log('Portable generic Agent reporter built ('+Buffer.byteLength(source)+' bytes); no credential/private allowlist.');
