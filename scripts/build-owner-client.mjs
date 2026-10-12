import './build-repository-run-reporter.mjs';
import {build} from 'esbuild';
for(const [entry,outfile] of [['owner-browser-entry','owner-auth-client'],['password-recovery-browser-entry','owner-password-recovery-client'],['owner-email-login-browser-entry','owner-email-login-client']]){
 const result=await build({entryPoints:['src/continuity/'+entry+'.mjs'],bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,sourcemap:false,legalComments:'eof',outfile:'public/'+outfile+'.js',metafile:true});
 if(Object.keys(result.metafile.inputs).some(p=>/repository\.mjs|owner-session\.mjs|private-continuity\.mjs|pending-store\.mjs/.test(p)))throw Error('PRIVATE_SOURCE_IN_CLIENT');
}
console.log('Pinned official Owner SDK browser bundles built; no source map/private repository included.');
