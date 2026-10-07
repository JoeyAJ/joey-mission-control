import {build} from 'esbuild';
const result=await build({entryPoints:['src/continuity/owner-browser-entry.mjs'],bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,sourcemap:false,legalComments:'eof',outfile:'public/owner-auth-client.js',metafile:true});
if(Object.keys(result.metafile.inputs).some(p=>/repository\.mjs|owner-session\.mjs|private-continuity\.mjs|pending-store\.mjs/.test(p)))throw Error('PRIVATE_SOURCE_IN_CLIENT');
console.log('Pinned official Owner SDK browser bundle built; no source map/private repository included.');
