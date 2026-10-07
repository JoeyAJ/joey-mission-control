// Bounded imported JSONL only. Does not launch or authenticate any agent.
import {createCandidateObserver} from './candidate-observer.mjs';
const root=process.argv[2],sessionId=process.argv[3];
try{
 const observer=await createCandidateObserver({root});
 let revision=(await observer.inspect(new Date().toISOString())).revision;
 const accept=async bytes=>{
  const line=bytes.toString('utf8').replace(/\r$/,'');
  const result=await observer.ingest({line,sessionId,deliverySequence:revision+1,expectedRevision:revision,receivedAt:new Date().toISOString()});
  // Only bounded result metadata goes to stdout. Never echo source bodies.
  process.stdout.write(JSON.stringify(result)+'\n');
  if(!result.accepted){process.exitCode=1;return false;}
  revision=result.revision;
  return true;
 };
 let pending=Buffer.alloc(0),stopped=false;
 for await(const chunk of process.stdin){
  let start=0;
  while(start<chunk.length){
   const newline=chunk.indexOf(10,start),end=newline<0?chunk.length:newline;
   if(pending.length+end-start>65536){process.stdout.write('{"accepted":false,"error":"INVALID_INPUT"}\n');process.exitCode=1;stopped=true;break;}
   pending=Buffer.concat([pending,chunk.subarray(start,end)]);
   if(newline<0)break;
   if(!await accept(pending)){stopped=true;break;}
   pending=Buffer.alloc(0);start=newline+1;
  }
  if(stopped){process.stdin.destroy();break;}
 }
 if(!stopped&&pending.length)await accept(pending);
}catch{process.stderr.write('Candidate observer unavailable; source body withheld\n');process.exitCode=1;}
