// Invoked ONLY after the reviewed installation/OS-service approval.
import {createHash,createPrivateKey,createPublicKey,generateKeyPairSync} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readFileSync,realpathSync,writeFileSync,renameSync,openSync,fsyncSync,closeSync,constants} from 'node:fs';
import {homedir,userInfo} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fail,identifier,exactKeys} from '../vendor/data.mjs';
import {POLICY_DIGEST} from './policy.mjs';
import {qualifyRuntime} from './runtime.mjs';
import {createTransport} from './transport.mjs';
import {resolvePinnedCodex,pilotServiceArgv} from './preflight.mjs';
export const stateRoot=()=>join(homedir(),'.local','state','mc-vm-link-0.1.1');
export const releaseRoot=()=>join(homedir(),'.local','lib','mc-vm-link','0.1.1');
export function privateDirectory(path,{create=false}={}){
 if(create&&!existsSync(path)){privateDirectory(dirname(path));mkdirSync(path,{mode:0o700});}
 const s=lstatSync(path);if(!s.isDirectory()||s.uid!==process.getuid()||s.isSymbolicLink()||realpathSync(path)!==path||(s.mode&0o022))fail('UNSAFE_INSTALL_DIRECTORY');return path;
}
export function privateFile(path){const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.uid!==process.getuid()||(s.mode&0o777)!==0o600||s.size>4096)fail('PRIVATE_FILE_REQUIRED');return readFileSync(path,'utf8');}
function write(path,value){const fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{writeFileSync(fd,value);fsyncSync(fd);}finally{closeSync(fd);}const d=openSync(dirname(path),constants.O_RDONLY|constants.O_DIRECTORY);try{fsyncSync(d);}finally{closeSync(d);}}
export async function findCodex(workspace){
 return qualifyRuntime(resolvePinnedCodex().executable,workspace);
}
function validateIdentity(ack,workerId,privateKey,artifactDigest){
 const der=createPublicKey(privateKey).export({type:'spki',format:'der'}),keyDigest=createHash('sha256').update(der).digest('hex');
 if(!exactKeys(ack,['paired','workerId','keyDigest','policyDigest','artifactDigest'])||ack.paired!==true||ack.workerId!==workerId||ack.keyDigest!==keyDigest||ack.policyDigest!==POLICY_DIGEST||ack.artifactDigest!==artifactDigest)fail('PAIRING_UNCONFIRMED');return keyDigest;
}
export async function pairInstallation({workerId,pairingCode,artifactDigest,requestFactory=createTransport}){
 if(!identifier(workerId)||!/^mc_pair_[A-Za-z0-9_-]{43}$/.test(pairingCode)||!/^[a-f0-9]{64}$/.test(artifactDigest)||process.platform!=='linux'||process.arch!=='x64')fail('INSTALL_SCOPE_REJECTED');
 privateDirectory(homedir());privateDirectory(join(homedir(),'.local'),{create:true});privateDirectory(join(homedir(),'.local','state'),{create:true});
 const root=stateRoot();if(existsSync(root))fail('INSTALLATION_EXISTS_RECONCILE_ONLY');privateDirectory(root,{create:true});const workspace=join(root,'smoke-workspace');privateDirectory(workspace,{create:true});
 const binding=await findCodex(workspace),pair=generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({type:'spki',format:'pem'});
 write(join(root,'worker-key.pem'),pair.privateKey.export({type:'pkcs8',format:'pem'}));write(join(root,'worker-public.pem'),publicKey);
 const config={version:'mc.vm-config.v1',enabled:false,workerId,executable:binding.executable,workspace,artifactDigest,policyDigest:POLICY_DIGEST,keyDigest:null};write(join(root,'config.json'),JSON.stringify(config));
 const request=requestFactory({workerId,privateKey:pair.privateKey});let ack;
 try{ack=await request('pair',{pairingCode,publicKey});}
 catch{
  // Pair commit / ACK uncertainty: identity proves the SAME local key, no code re-entry/rekey/job.
  try{ack=await request('identity',{});}catch{fail('PAIRING_UNCONFIRMED_RECONCILE_ONLY');}
 }
 config.keyDigest=validateIdentity(ack,workerId,pair.privateKey,artifactDigest);config.enabled=true;
 write(join(root,'config.json.new'),JSON.stringify(config));renameSync(join(root,'config.json.new'),join(root,'config.json'));const d=openSync(root,constants.O_RDONLY|constants.O_DIRECTORY);try{fsyncSync(d);}finally{closeSync(d);}return {paired:true,workerId,keyDigest:config.keyDigest};
}
export function loadInstallation(){
 const root=stateRoot();privateDirectory(root);if((lstatSync(root).mode&0o777)!==0o700)fail('UNSAFE_STATE_ROOT');const config=JSON.parse(privateFile(join(root,'config.json')));
 if(!exactKeys(config,['version','enabled','workerId','executable','workspace','artifactDigest','policyDigest','keyDigest'])||config.version!=='mc.vm-config.v1'||config.enabled!==true||!identifier(config.workerId)||config.workspace!==join(root,'smoke-workspace')||config.policyDigest!==POLICY_DIGEST||!/^[a-f0-9]{64}$/.test(config.artifactDigest))fail('PAIRING_RECEIPT_REQUIRED');
 const privateKey=createPrivateKey(privateFile(join(root,'worker-key.pem')));validateIdentity({paired:true,workerId:config.workerId,keyDigest:config.keyDigest,policyDigest:config.policyDigest,artifactDigest:config.artifactDigest},config.workerId,privateKey,config.artifactDigest);
 if(privateFile(join(root,'worker-public.pem'))!==createPublicKey(privateKey).export({type:'spki',format:'pem'}))fail('WORKER_KEY_MISMATCH');return {root,config,privateKey};
}
export function serviceArgv(workerId,{user=userInfo(),release=releaseRoot()}={}){
 if(!identifier(workerId)||!Number.isSafeInteger(user.uid)||user.uid<=0||release!==releaseRoot())fail('SERVICE_SCOPE_REJECTED');
 return pilotServiceArgv(workerId,{home:homedir(),user});
}
export function startApprovedTransientService(workerId){
 const result=spawnSync('/usr/bin/sudo',serviceArgv(workerId),{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']});if(result.status!==0)fail('OS_SERVICE_START_NOT_AUTHORIZED_OR_UNAVAILABLE');return {serviceRequested:true,bootPersistent:false,restart:false,maxSeconds:1000};
}
