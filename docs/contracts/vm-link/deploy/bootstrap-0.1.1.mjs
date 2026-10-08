// Reviewed, non-secret bootstrap. Only execute after the consolidated activation approval.
import {createHash,randomUUID} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {gunzipSync} from 'node:zlib';
import {existsSync,lstatSync,mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const AUDIENCE='https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1';
const EXPECTED_ARTIFACT='9bb363726a13bd96341c84b015354daaa454c6265b5bf0d2c5aff6eab1e3d647';
const FILES=["package.json","src/cli.mjs","src/installation.mjs","src/journal.mjs","src/policy.mjs","src/protocol.mjs","src/runtime.mjs","src/transport.mjs","src/worker.mjs","vendor/codex-jsonl.mjs","vendor/data.mjs","vendor/safe-payload.mjs"];
function denied(code){const e=Error(code);e.code=code;throw e;}
function directory(path){
 if(!existsSync(path)){directory(dirname(path));mkdirSync(path,{mode:0o700});}
 const s=lstatSync(path);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||realpathSync(path)!==path||(s.mode&0o022))denied('UNSAFE_INSTALL_DIRECTORY');
}
async function maskedCode(){
 if(!process.stdin.isTTY||!process.stdout.isTTY)denied('SECURE_TTY_REQUIRED');
 const prompt=()=>process.stdout.write('MC pairing code (hidden; paste here, then Enter): ');
 process.stdin.setRawMode(true);process.stdout.write('\u001b[?2004h');prompt();process.stdin.resume();
 let value='',invalid=false,escape='',pasting=false,pasteEndedLine=false,settled=false;
 return new Promise((resolve,reject)=>{
  const done=error=>{if(settled)return;settled=true;clearTimeout(timer);process.stdin.off('data',receive);process.stdin.off('end',ended);process.stdin.off('error',ended);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\u001b[?2004l\n');error?reject(error):resolve(value);};
  const ended=()=>done(Object.assign(Error('USER_CANCELLED'),{code:'USER_CANCELLED'}));
  const reset=message=>{value='';invalid=false;escape='';pasting=false;pasteEndedLine=false;process.stdout.write('\n'+message+'\n');prompt();};
  const receive=chunk=>{for(const c of chunk.toString('utf8')){
   if(c==='\u0003'||c==='\u0004'){ended();return;}
   if(escape){escape+=c;
    if(escape==='\u001b[200~'){if(pasting)invalid=true;pasting=true;pasteEndedLine=false;escape='';}
    else if(escape==='\u001b[201~'){if(!pasting)invalid=true;pasting=false;escape='';}
    else if(!['\u001b[200~','\u001b[201~'].some(x=>x.startsWith(escape))){invalid=true;escape='';}
    continue;
   }
   if(c==='\u001b'){escape=c;continue;}
   if(c==='\r'||c==='\n'){
    if(pasting){pasteEndedLine=true;continue;}
    if(!invalid&&/^mc_pair_[A-Za-z0-9_-]{43}$/.test(value)){done();return;}
    reset(value||invalid?'Input not accepted. Stay here and paste the current code again.':'Still waiting for the code. Blank Enter does not submit.');continue;
   }
   if(c==='\u007f'||c==='\b'){if(!pasting)value=value.slice(0,-1);else invalid=true;continue;}
   if(pasteEndedLine||!/[A-Za-z0-9_-]/.test(c)||value.length>=51){invalid=true;continue;}
   value+=c;
  }};
  const timer=setTimeout(()=>done(Object.assign(Error('PAIRING_INPUT_TIMEOUT'),{code:'PAIRING_INPUT_TIMEOUT'})),900000);
  process.stdin.on('data',receive);process.stdin.once('end',ended);process.stdin.once('error',ended);
 });
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
