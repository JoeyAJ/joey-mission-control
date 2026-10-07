// Synthetic DOM-only verification. No provider client, live account, email or reset.
import {build} from 'esbuild';import {createRequire} from 'node:module';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MC_PLAYWRIGHT_MODULE||(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright'));
const result=await build({entryPoints:['src/continuity/password-recovery-ui.mjs'],bundle:true,format:'iife',globalName:'recoveryFixture',write:false});
const browser=await chromium.launch({headless:true,executablePath:process.env.MC_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{let network=0;const cases=[],errors=[];
 for(const width of [1440,390,320])for(const locale of ['zh-TW','en','ko']){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('request',()=>network++);page.on('pageerror',error=>errors.push(error.name));await page.goto('about:blank');await page.addScriptTag({content:result.outputFiles[0].text});
  const receipt=await page.evaluate(async({locale})=>{
   const metrics={updates:0,requests:0,verifications:0,disposed:0};
   function port(initial){let current=initial;return {configured:true,capabilities:{requestEmail:false,changePassword:true},view:()=>({status:current}),inspect:async()=>({status:current}),subscribe:()=>()=>{},requestEmail:async()=>{metrics.requests++;return {status:'request_completed'};},changePassword:async({password,confirmation,explicit})=>{if(!explicit||password!==confirmation||password!=='Synthetic choice')throw Error('Synthetic input mismatch');metrics.updates++;current='updated_reauthenticate';return {status:current};},verifyAuthenticator:async({code,explicit})=>{if(!explicit||code!=='123456')throw Error('Synthetic input mismatch');metrics.verifications++;current='ready';return {status:current};},dispose(){metrics.disposed++;}};}
   const wait=()=>new Promise(resolve=>setTimeout(resolve,5));
   const active=recoveryFixture.mountPasswordRecovery({locale,port:port('ready')});document.body.replaceChildren(active);await wait();
   const fields=[...active.querySelectorAll('input[autocomplete=new-password]')];fields.forEach(node=>node.value='Synthetic choice');fields[0].closest('form').dispatchEvent(new Event('submit',{cancelable:true}));
   if(fields.some(node=>node.value))throw Error('Synthetic password residue before result');await wait();
   if(metrics.updates!==1||fields.some(node=>node.value))throw Error('Synthetic update result');active.dispose();
   const resumed=recoveryFixture.mountPasswordRecovery({locale,port:port('link_required')});document.body.replaceChildren(resumed);await wait();
   if([...resumed.querySelectorAll('input')].some(node=>node.value))throw Error('Interrupted values restored');
   if(resumed.querySelector('input[autocomplete=new-password]').disabled!==true)throw Error('Recovery link gate missing');resumed.dispose();
   const mfa=recoveryFixture.mountPasswordRecovery({locale,port:port('mfa_required')});document.body.replaceChildren(mfa);await wait();
   const code=mfa.querySelector('input[autocomplete=one-time-code]');code.value='123456';code.closest('form').dispatchEvent(new Event('submit',{cancelable:true}));await wait();
   if(code.value||metrics.verifications!==1)throw Error('Synthetic authenticator residue');
   const noOverflow=document.documentElement.scrollWidth<=innerWidth;mfa.dispose();
   const disabled=recoveryFixture.mountPasswordRecovery({locale,port:{configured:false}});document.body.replaceChildren(disabled);
   if(disabled.querySelector('input'))throw Error('Disabled configuration collected credentials');
   return {syntheticOnly:true,passwordCleared:true,interruptedValuesNotRestored:true,authenticatorCodeCleared:true,configurationGate:true,noOverflow,requests:metrics.requests};
  },{locale});if(!receipt.noOverflow||receipt.requests!==0)throw Error('Synthetic layout or email boundary');cases.push({width,locale,...receipt});await page.close();
 }
 if(network||errors.length)throw Error('Synthetic recovery browser generated network or page errors');
 const receipt={pass:true,syntheticOnly:true,cases,networkRequests:network,pageErrors:errors,realAuthVerified:false,realPasswordResetPerformed:false};
 await fs.writeFile(process.argv[2]||path.join(os.tmpdir(),'mc-password-recovery-browser.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({pass:true,syntheticOnly:true,cases:cases.length,networkRequests:network,pageErrors:errors.length,realAuthVerified:false,realPasswordResetPerformed:false}));
}finally{await browser.close();}
