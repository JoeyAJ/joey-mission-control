// Reviewed, non-secret bootstrap. Only execute after the consolidated activation approval.
import {createHash,randomUUID} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {gunzipSync} from 'node:zlib';
import {existsSync,lstatSync,mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const AUDIENCE='https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1';
const EXPECTED_ARTIFACT='@@ARTIFACT_DIGEST@@';
const FILES=@@FILES@@;
function denied(code){const e=Error(code);e.code=code;throw e;}
function directory(path){
 if(!existsSync(path)){directory(dirname(path));mkdirSync(path,{mode:0o700});}
 const s=lstatSync(path);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||realpathSync(path)!==path||(s.mode&0o022))denied('UNSAFE_INSTALL_DIRECTORY');
}
async function maskedCode(){
 if(!process.stdin.isTTY||!process.stdout.isTTY)denied('SECURE_TTY_REQUIRED');
 process.stdout.write('一次性 MC 配對碼（輸入不回顯）: ');process.stdin.setRawMode(true);process.stdin.resume();let value='';
 return new Promise((resolve,reject)=>{const done=(error)=>{process.stdin.off('data',receive);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');error?reject(error):resolve(value);};
 const receive=chunk=>{for(const c of chunk.toString('utf8')){if(c==='\u0003'){done(Object.assign(Error('USER_CANCELLED'),{code:'USER_CANCELLED'}));return;}if(c==='\r'||c==='\n'){done();return;}if(c==='\u007f'||c==='\b'){value=value.slice(0,-1);continue;}if(!/[A-Za-z0-9_-]/.test(c)||value.length>=51){done(Object.assign(Error('PAIRING_CODE_INVALID'),{code:'PAIRING_CODE_INVALID'}));return;}value+=c;}};process.stdin.on('data',receive);});
}
async function main(){
 const [workerId,...rest]=process.argv.slice(2);if(rest.length||!/^ubuntu-1-[a-f0-9-]{36}$/.test(workerId||'')||process.platform!=='linux'||process.arch!=='x64'||Number(process.versions.node.split('.')[0])<18)denied('INSTALL_SCOPE_REJECTED');
 if(['HTTPS_PROXY','HTTP_PROXY','https_proxy','http_proxy'].some(k=>process.env[k]))denied('STANDARD_PROXY_AGENT_REQUIRED');
 let code=await maskedCode();if(!/^mc_pair_[A-Za-z0-9_-]{43}$/.test(code))denied('PAIRING_CODE_INVALID');
 const res=await fetch(AUDIENCE,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({action:'bootstrap',workerId,requestId:randomUUID(),pairingCode:code}),signal:AbortSignal.timeout(5000)});
 if(!res.ok)denied('BROKER_HTTP_'+res.status);const parts=[];let bytes=0;const reader=res.body.getReader();
 try{while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>262144)denied('ARTIFACT_LIMIT');parts.push(r.value);}}finally{await reader.cancel();}
 const archive=Buffer.concat(parts);if(createHash('sha256').update(archive).digest('hex')!==EXPECTED_ARTIFACT)denied('ARTIFACT_DIGEST_MISMATCH');
 const bundle=JSON.parse(gunzipSync(archive,{maxOutputLength:512000}).toString('utf8'));if(bundle.release!=='0.1.1'||Object.keys(bundle).sort().join(',')!=='files,release'||Object.keys(bundle.files).sort().join('\n')!==FILES.join('\n'))denied('ARTIFACT_MANIFEST_INVALID');
 const root=join(homedir(),'.local','lib','mc-vm-link','0.1.1');if(existsSync(root))denied('INSTALLATION_EXISTS_RECONCILE_ONLY');directory(homedir());directory(root);
 for(const file of FILES){const text=bundle.files[file];if(typeof text!=='string'||Buffer.byteLength(text)>128000||file.includes('..')||file.startsWith('/'))denied('ARTIFACT_MANIFEST_INVALID');directory(dirname(join(root,file)));writeFileSync(join(root,file),text,{mode:0o600,flag:'wx'});}
 const {pairInstallation,startApprovedTransientService}=await import(pathToFileURL(join(root,'src','installation.mjs')));
 const pair=await pairInstallation({workerId,pairingCode:code,artifactDigest:EXPECTED_ARTIFACT});code='';const service=startApprovedTransientService(workerId);
 console.log(JSON.stringify({...pair,...service,canonicalSubmit:false}));
}
main().catch(error=>{const c=error.code||'';console.error(JSON.stringify({status:'BLOCKED',code:/^[A-Z][A-Z0-9_]{1,80}$/.test(c)?c:'INSTALLATION_NOT_CONFIRMED'}));process.exitCode=1;});
