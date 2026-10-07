// Read-only public settings. Run ONCE only in the fresh saved environment after republish.
import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {ownerAuthConfig} from '../public/owner-auth-config.js';
export function ownerAuthSettingsCurlArgs(file){return ['--disable','--retry','0','--max-redirs','0','--silent','--show-error','--connect-timeout','15','--max-time','25','--request','GET','--header','apikey: '+ownerAuthConfig.publishableKey,'--output',file,'--write-out','%{http_code}',ownerAuthConfig.origin+'/auth/v1/settings'];}
export function qualifyOwnerAuthSettings(status,body){
 const fields={disableSignup:body?.disable_signup===true?true:body?.disable_signup===false?false:null,anonymousUsers:body?.external?.anonymous_users===true?true:body?.external?.anonymous_users===false?false:null,email:body?.external?.email===true?true:body?.external?.email===false?false:null};
 return Object.freeze({httpStatus:status,fields,qualification:status===200&&fields.disableSignup===true&&fields.anonymousUsers===false&&fields.email===true?'SERVER_SETTINGS_CLOSED':'UNCONFIRMED_OR_NOT_CLOSED'});
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--inspect-plan'))console.log(JSON.stringify({method:'GET',origin:ownerAuthConfig.origin,path:'/auth/v1/settings',readOnly:true,retries:0,credentials:'EXISTING_MODERN_PUBLISHABLE_ONLY',freshEnvironmentRequired:true}));
 else if(!process.argv.includes('--fresh-env-after-republish'))throw Error('FRESH_ENV_AFTER_REPUBLISH_REQUIRED_NO_OLD_INSTANCE_RETRY');
 else{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mc-auth-settings-')),file=path.join(dir,'response.json');let receipt;
  try{const status=Number(execFileSync('curl',ownerAuthSettingsCurlArgs(file),{encoding:'utf8',stdio:['ignore','pipe','pipe']}));let body;try{body=JSON.parse(await fs.readFile(file,'utf8'));}catch{body=null;}receipt=qualifyOwnerAuthSettings(status,body);}catch(e){receipt={qualification:'NETWORK_BLOCKED_OR_ERROR',processStatus:e.status??null,noRetry:true};}
  finally{await fs.rm(dir,{recursive:true,force:true});}
  console.log(JSON.stringify({origin:ownerAuthConfig.origin,path:'/auth/v1/settings',readOnly:true,...receipt}));if(receipt.qualification!=='SERVER_SETTINGS_CLOSED')process.exitCode=1;
 }
}
