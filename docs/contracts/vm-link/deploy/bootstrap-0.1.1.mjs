// Reviewed, non-secret bootstrap. Only execute after the consolidated activation approval.
import {createHash,randomUUID} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {gunzipSync} from 'node:zlib';
import {existsSync,lstatSync,mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const AUDIENCE='https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1';
const EXPECTED_ARTIFACT='0de5fbd05a012fccabb23a4edf2ff7374b71d695b2505cfc4092ac8b85076613';
const FILES=["package.json","src/cli.mjs","src/installation.mjs","src/journal.mjs","src/policy.mjs","src/preflight.mjs","src/protocol.mjs","src/runtime.mjs","src/transport.mjs","src/worker.mjs","vendor/codex-jsonl.mjs","vendor/data.mjs","vendor/safe-payload.mjs"];
// Read-only local metadata and permission listing. Never invoke Codex, log in,
// read Auth/config/key contents, create a service, contact a host or change files.
import * as pfFs from 'node:fs';
import * as pfOs from 'node:os';
import * as pfPath from 'node:path';
import {createHash as pfCreateHash} from 'node:crypto';
import {createRequire as pfCreateRequire} from 'node:module';
import {spawnSync as pfSpawnSync} from 'node:child_process';
const PREFLIGHT_CODEX_SHA256='9a820c17865fa825d04db416818679a9d63bd72e50835c396f496e5684626c9c';
const PREFLIGHT_CODEX_BYTES=292309256;
const pfFail=code=>{const e=Error(code);e.code=code;throw e;};
const pfNodeOk=v=>{const a=v.replace(/^v/,'').split('.').map(Number);return a[0]>18||(a[0]===18&&(a[1]>19||(a[1]===19&&a[2]>=1)));};
function pfMetadata(path,fs=pfFs){const s=fs.lstatSync(path);if(!s.isFile()||s.size>65536)pfFail('PINNED_CODEX_REQUIRED');return JSON.parse(fs.readFileSync(path,'utf8'));}
function resolvePinnedCodex({home=pfOs.homedir(),fs=pfFs,resolvePackage=(p,n)=>pfCreateRequire(p).resolve(n)}={}){
 const prefix=pfPath.join(home,'.local','lib','node_modules','@openai'),root=pfPath.join(prefix,'codex'),pkg=pfPath.join(root,'package.json');
 const metadata=pfMetadata(pkg,fs);if(metadata.name!=='@openai/codex'||metadata.version!=='0.161.0')pfFail('PINNED_CODEX_REQUIRED');
 // Exactly the pinned official CLI's package resolver and linux-x64 target.
 // Native 0.161.0 is vendor/<target>/bin/codex, not .../codex/codex.
 let vendor;try{vendor=pfPath.join(pfPath.dirname(resolvePackage(pkg,'@openai/codex-linux-x64/package.json')),'vendor');}
 catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;vendor=pfPath.join(root,'vendor');}
 const candidate=pfPath.join(vendor,'x86_64-unknown-linux-musl','bin','codex');
 if(!fs.existsSync(candidate))pfFail('PINNED_CODEX_PATH_REQUIRED');
 const executable=fs.realpathSync(candidate),s=fs.lstatSync(candidate);
 if(s.isSymbolicLink()||candidate!==executable||!executable.startsWith(prefix+'/'))pfFail('RUNTIME_PATH_REJECTED');
 return {executable,packageRoot:root,packageVersion:metadata.version};
}
function pilotServiceArgv(workerId,{home=pfOs.homedir(),user=pfOs.userInfo()}={}){
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(workerId)||!Number.isSafeInteger(user.uid)||user.uid<=0||!Number.isSafeInteger(user.gid)||user.gid<0)pfFail('SERVICE_SCOPE_REJECTED');
 return ['-n','/usr/bin/systemd-run','--quiet','--no-ask-password','--unit=mc-vm-link-pilot-'+workerId,'--uid='+user.uid,'--gid='+user.gid,'--setenv=HOME='+home,'--setenv=USER='+user.username,'--setenv=LOGNAME='+user.username,
 '--property=RuntimeMaxSec=1000','--property=Restart=no','--property=UMask=0077','--property=KillMode=control-group','--property=TimeoutStopSec=10','--property=StandardOutput=null','--property=StandardError=null','--collect','/usr/bin/node',pfPath.join(home,'.local','lib','mc-vm-link','0.1.1','src','cli.mjs'),'run'];
}
async function pilotPreflight(workerId,{home=pfOs.homedir(),user=pfOs.userInfo(),fs=pfFs,exec=pfSpawnSync,resolvePackage,hashFile,platform=process.platform,arch=process.arch,nodeVersion=process.versions.node,env=process.env,umask=process.umask()}={}){
 const checks=[],blockers=[];const add=(name,pass,detail={})=>{checks.push({name,pass,...detail});if(!pass)blockers.push(name);};
 const safeEnv={HOME:home,USER:user.username,LOGNAME:user.username,PATH:'/usr/bin:/bin',LANG:'C.UTF-8'};
 let trustedTools=new Set();const run=(path,args)=>{if(!trustedTools.has(path))return {status:null,stdout:''};try{return exec(path,args,{encoding:'utf8',timeout:5000,maxBuffer:16384,stdio:['ignore','pipe','pipe'],env:safeEnv});}catch{return {status:null,stdout:''};}};
 const present=path=>{try{fs.lstatSync(path);return true;}catch{return false;}};
 const dir=label=>{const path=label==='.'?home:pfPath.join(home,label);let s;try{s=fs.lstatSync(path);}catch(e){return {label,exists:false,status:e.code==='ENOENT'?'MISSING':'STAT_ERROR',guardPass:label!=='.'&&e.code==='ENOENT'};}
  let canonical=false;try{canonical=fs.realpathSync(path)===path;}catch{}return {label,exists:true,directory:s.isDirectory(),symlink:s.isSymbolicLink(),uid:s.uid,gid:s.gid,mode:(s.mode&0o7777).toString(8).padStart(4,'0'),guardPass:s.isDirectory()&&!s.isSymbolicLink()&&s.uid===user.uid&&canonical&&!(s.mode&0o022),canonical};};
 add('runtime_scope',platform==='linux'&&arch==='x64'&&user.uid>0&&pfNodeOk(nodeVersion),{platform,arch,uid:user.uid,gid:user.gid,nodeVersion});
 add('private_creation_mode',(0o700&~umask)===0o700&&(0o600&~umask)===0o600,{umask:umask.toString(8).padStart(4,'0')});
 add('direct_standard_fetch',!['HTTPS_PROXY','HTTP_PROXY','https_proxy','http_proxy'].some(k=>Boolean(env[k])),{proxyPresent:['HTTPS_PROXY','HTTP_PROXY','https_proxy','http_proxy'].some(k=>Boolean(env[k]))});
 const directories=['.','.local','.local/lib','.local/lib/mc-vm-link','.local/lib/mc-vm-link/0.1.1','.local/state','.local/state/mc-vm-link-0.1.1','.local/state/mc-vm-link-0.1.1/smoke-workspace'].map(dir);
 add('directory_guards',directories.every(d=>d.guardPass),{directories});
 const release=pfPath.join(home,'.local/lib/mc-vm-link/0.1.1'),state=pfPath.join(home,'.local/state/mc-vm-link-0.1.1');
 const existing={releaseExists:present(release),stateExists:present(state),privateKeyExists:present(pfPath.join(state,'worker-key.pem')),publicKeyExists:present(pfPath.join(state,'worker-public.pem')),configExists:present(pfPath.join(state,'config.json')),journalExists:present(pfPath.join(state,'journal.json')),lockExists:present(pfPath.join(state,'writer.lock'))};
 add('fresh_installation',!existing.releaseExists&&!existing.stateExists,{...existing,reconcileRequired:existing.releaseExists||existing.stateExists});
 try{const native=resolvePinnedCodex({home,fs,resolvePackage}),s=fs.lstatSync(native.executable);let digest=null;
  if(s.isFile()&&s.size===PREFLIGHT_CODEX_BYTES&&(s.mode&0o111)){if(hashFile)digest=await hashFile(native.executable);else{const h=pfCreateHash('sha256');for await(const chunk of fs.createReadStream(native.executable))h.update(chunk);digest=h.digest('hex');}}
  add('pinned_native',digest===PREFLIGHT_CODEX_SHA256,{path:native.executable,packageVersion:native.packageVersion,bytes:s.size,sha256:digest});
  const shim=pfPath.join(home,'.local/bin/codex');add('official_cli_shim',fs.realpathSync(shim)===pfPath.join(native.packageRoot,'bin/codex.js'));
 }catch(e){add('pinned_native',false,{code:['PINNED_CODEX_REQUIRED','PINNED_CODEX_PATH_REQUIRED','RUNTIME_PATH_REJECTED'].includes(e.code)?e.code:'RUNTIME_METADATA_UNAVAILABLE'});}
 const paths=['/usr/bin/node','/usr/bin/sudo','/usr/bin/systemd-run','/usr/bin/systemctl','/usr/bin/timedatectl'];
 const tools=paths.map(path=>{try{const s=fs.statSync(path);return {path,ready:s.isFile()&&Boolean(s.mode&0o111)&&s.uid===0&&!(s.mode&0o022)};}catch{return {path,ready:false};}});trustedTools=new Set(tools.filter(t=>t.ready).map(t=>t.path));add('service_tools',tools.every(t=>t.ready),{tools});
 const node=run('/usr/bin/node',['--version']),serviceNodeVersion=/^v\d+\.\d+\.\d+/.exec(node.stdout||'')?.[0]||null;add('service_node',node.status===0&&serviceNodeVersion!==null&&pfNodeOk(serviceNodeVersion),{version:serviceNodeVersion});
 const help=run('/usr/bin/systemd-run',['--help']),required=['--uid','--gid','--setenv','--property','--collect','--no-ask-password'];add('systemd_run_options',help.status===0&&required.every(x=>(help.stdout||'').includes(x)));
 const sudoVersionResult=run('/usr/bin/sudo',['--version']),sudoVersion=/^Sudo version ([0-9.]+[a-z0-9]*)/m.exec(sudoVersionResult.stdout||'')?.[1]||null;add('sudo_version_metadata',sudoVersion!==null,{version:sudoVersion});
 const manager=run('/usr/bin/systemctl',['--system','is-system-running','--no-pager']),managerState=(manager.stdout||'').trim();add('system_manager',['running','degraded'].includes(managerState),{state:['running','degraded','starting','offline','maintenance','stopping','initializing','unknown'].includes(managerState)?managerState:'UNAVAILABLE'});
 const clock=run('/usr/bin/timedatectl',['show','--property=NTPSynchronized','--value']);add('clock_synchronized',clock.status===0&&(clock.stdout||'').trim()==='yes',{confirmed:clock.status===0&&(clock.stdout||'').trim()==='yes'});
 let serviceArgs;try{serviceArgs=pilotServiceArgv(workerId,{home,user});}catch{add('service_scope',false);}
 if(serviceArgs){const permission=run('/usr/bin/sudo',['-n','-l','-l','--',...serviceArgs.slice(1)]),listed=permission.status===0,passwordless=listed&&/\bNOPASSWD\b|!authenticate\b/.test(permission.stdout||'');
  add('passwordless_exact_service_permission',passwordless,{listed,passwordlessFlagObserved:passwordless,executionProven:false});
  const unit=run('/usr/bin/systemctl',['--system','show','--property=LoadState','--property=ActiveState','--no-pager','mc-vm-link-pilot-'+workerId+'.service']);
  add('service_unit_absent',[0,1].includes(unit.status)&&/^LoadState=not-found$/m.test(unit.stdout||'')&&/^ActiveState=inactive$/m.test(unit.stdout||''));
 }
 return {schema:'mc.vm-pilot-preflight.v1',readOnly:true,ready:blockers.length===0,checks,blockers,networkCalls:0,authCacheRead:false,codexInvoked:false,serviceStarted:false,permissionChanged:false,chatgptAuthCurrentReadback:false};
}

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
 const args=process.argv.slice(2),diagnostic=args[0]==='--preflight',workerId=args[diagnostic?1:0];if(args.length!==(diagnostic?2:1)||!/^ubuntu-1-[a-f0-9-]{36}$/.test(workerId||''))denied('INSTALL_SCOPE_REJECTED');
 const preflight=await pilotPreflight(workerId);
 if(diagnostic){console.log(JSON.stringify(preflight));process.exitCode=preflight.ready?0:1;return;}
 if(!preflight.ready){console.error(JSON.stringify(preflight));denied('PILOT_PREFLIGHT_BLOCKED');}
 console.log(JSON.stringify({status:'LOCAL_PREFLIGHT_PASS',pairingCreated:false,serviceStarted:false}));
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
