// No secret reads here: the deployment entry injects its server-only RPC port.
import {Buffer} from 'node:buffer';
import {createHash,randomUUID} from 'node:crypto';
import {canonical,exactKeys,fail,identifier,jsonData} from '../vendor/data.mjs';
import {validateRequest} from '../src/protocol.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Supabase forwards a function-name-prefixed pathname to the runtime. The
// signed envelope still binds to the exact public AUDIENCE in validateRequest.
function routePath(url){
 const parsed=new URL(url),raw=/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]+(\/[^?#]*)?$/.exec(url);
 if(!raw||parsed.username||parsed.password||parsed.pathname!==raw[1])fail('INVALID_REQUEST');
 if(raw[1]!=='/mc-worker-link-v1'&&raw[1]!=='/mc-worker-link-v1/bootstrap.mjs')fail('INVALID_REQUEST');
 return raw[1];
}
export function publicKeyBytes(pem){
 if(typeof pem!=='string'||!/^-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/]{59}=\n-----END PUBLIC KEY-----\n$/.test(pem))fail('INVALID_SIGNATURE');
 const der=Buffer.from(pem.split('\n')[1],'base64');
 if(der.length!==44||der.subarray(0,12).toString('hex')!=='302a300506032b6570032100')fail('INVALID_SIGNATURE');
 return der;
}
async function verify(envelope,pem,now){
 if(!exactKeys(envelope,['request','signature'])||typeof envelope.signature!=='string'||! /^[A-Za-z0-9+/]{86}==$/.test(envelope.signature))fail('INVALID_SIGNATURE');
 const request=validateRequest(envelope.request),der=publicKeyBytes(pem);
 if(Math.abs(now-request.issuedAt)>30000)fail('INVALID_SIGNATURE');
 const key=await crypto.subtle.importKey('spki',der,{name:'Ed25519'},false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,Buffer.from(envelope.signature,'base64'),new TextEncoder().encode(canonical(request))))fail('INVALID_SIGNATURE');
 return request;
}
async function boundedBody(req){
 if(req.headers.get('content-type')!=='application/json'||Number(req.headers.get('content-length')||0)>48000)fail('REQUEST_LIMIT');
 const reader=req.body?.getReader();if(!reader)fail('INVALID_REQUEST');let size=0;const parts=[];
 try{while(true){const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>48000)fail('REQUEST_LIMIT');parts.push(x.value);}
 const value=JSON.parse(Buffer.concat(parts).toString('utf8'));jsonData(value,{maxBytes:48000,maxString:256});return value;
 }finally{await reader.cancel();}
}
const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
export function createEdgeHandler({enabled=false,rpc,artifact,artifactDigest,policyDigest,bootstrap,now=Date.now}){
 return async req=>{
  if(enabled!==true)return Response.json({code:'LINK_DISABLED'},{status:503,headers});
  try{
   const path=routePath(req.url);
   if(req.method==='GET'&&path==='/mc-worker-link-v1/bootstrap.mjs'&&typeof bootstrap==='string')return new Response(bootstrap,{headers:{...headers,'content-type':'text/javascript; charset=utf-8'}});
   if(req.method!=='POST'||path!=='/mc-worker-link-v1')fail('INVALID_REQUEST');
   const value=await boundedBody(req);let request,body;
   if(value.action==='bootstrap'){
    if(!exactKeys(value,['action','workerId','requestId','pairingCode'])||!identifier(value.workerId)||!identifier(value.requestId)||!/^mc_pair_[A-Za-z0-9_-]{43}$/.test(value.pairingCode))fail('PAIRING_DENIED');
    const ack=await rpc({workerId:value.workerId,requestId:value.requestId,action:'bootstrap',body:{pairingHash:hash(value.pairingCode)}});
    if(ack.authorized!==true||ack.artifactDigest!==artifactDigest||ack.policyDigest!==policyDigest||!artifact||hash(artifact)!==artifactDigest)fail('ARTIFACT_UNAVAILABLE');
    return new Response(artifact,{headers:{...headers,'content-type':'application/gzip','x-mc-artifact-sha256':artifactDigest}});
   }
   validateRequest(value.request);
   if(value.request.action==='pair'){
    request=await verify(value,value.request.body.publicKey,now());
    const der=publicKeyBytes(request.body.publicKey);
    body={pairingHash:hash(request.body.pairingCode),publicKey:request.body.publicKey,keyDigest:hash(der)};
   }else{
    const key=await rpc({workerId:value.request.workerId,requestId:randomUUID(),action:'lookup',body:{}});
    request=await verify(value,key.publicKey,now());body=request.body;
   }
   const ack=await rpc({workerId:request.workerId,requestId:request.requestId,action:request.action,body});
   if(JSON.stringify(ack).length>8192)fail('RESPONSE_LIMIT');
   return Response.json(ack,{headers});
  }catch{
   // No body, Auth response, JWT, key, pairing code, prompt or raw error logging.
   return Response.json({code:'LINK_REQUEST_DENIED'},{status:403,headers});
  }
 };
}
