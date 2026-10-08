import {pathToFileURL} from 'node:url';
import {AUDIENCE} from './protocol.mjs';
import {fail} from '../vendor/data.mjs';
import {openJournal} from './journal.mjs';
import {qualifyRuntime,createProcessPort,CODEX_SHA256} from './runtime.mjs';
import {createTransport} from './transport.mjs';
import {runPilot,reconcileOnly} from './worker.mjs';
import {loadInstallation} from './installation.mjs';
export async function main(argv){
 if(argv.length!==1||!['check','run','reconcile-only'].includes(argv[0]))fail('INVALID_COMMAND');
 if(argv[0]==='check'){console.log(JSON.stringify({version:'0.1.1',runtimeCompatible:Number(process.versions.node.split('.')[0])>=18,activated:false,brokerDeployed:false,audience:AUDIENCE,nativeCodexSha256:CODEX_SHA256}));return;}
 const {root,config,privateKey}=loadInstallation(),journal=openJournal(root);let stop=false;const signal=()=>{stop=true;};process.on('SIGTERM',signal);process.on('SIGINT',signal);
 try{const request=createTransport({workerId:config.workerId,privateKey});
  if(argv[0]==='reconcile-only'){console.log(JSON.stringify({outcome:await reconcileOnly({journal,request})}));return;}
  if(journal.read().phase!=='IDLE')fail('RECOVERY_REQUIRED');
  const binding=await qualifyRuntime(config.executable,config.workspace),outcome=await runPilot({workerId:config.workerId,journal,request,startProcess:createProcessPort(binding),stopping:()=>stop});console.log(JSON.stringify({outcome}));
 }finally{journal.close();process.off('SIGTERM',signal);process.off('SIGINT',signal);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).catch(error=>{const c=error.code||'';console.error(JSON.stringify({status:'BLOCKED',code:/^[A-Z][A-Z0-9_]{1,80}$/.test(c)?c:'LOCAL_RUNTIME_ERROR'}));process.exitCode=1;});
