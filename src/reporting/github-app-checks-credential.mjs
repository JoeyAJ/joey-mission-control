// Server-only GitHub App credentials. Never serialize JWTs, private keys or installation tokens.
import {Buffer} from 'node:buffer';
import {createPrivateKey,sign} from 'node:crypto';

const keys=['MC_GITHUB_APP_ID','MC_GITHUB_APP_INSTALLATION_ID','MC_GITHUB_APP_PRIVATE_KEY'];
const unavailable=(code,phase,upstreamStatus)=>Object.assign(new Error(code),{appCredential:true,code,phase,...(upstreamStatus?{upstreamStatus}:{})});
export const appChecksConfigured=environment=>keys.some(k=>Boolean(environment[k]));

export function createAppChecksCredential({environment=process.env,fetchImpl=globalThis.fetch,now=Date.now,repositories=[]}={}){
 const allowed=new Set(repositories),cache=new Map(),pending=new Map();
 async function mint(repository){
  let jwt;
  try{
   const id=environment.MC_GITHUB_APP_ID,installation=environment.MC_GITHUB_APP_INSTALLATION_ID;
   if(!/^[1-9][0-9]{0,19}$/.test(id||'')||!/^[1-9][0-9]{0,19}$/.test(installation||''))throw Error();
   const pem=environment.MC_GITHUB_APP_PRIVATE_KEY;
   if(typeof pem!=='string'||pem.length>16384)throw Error();
   const key=createPrivateKey(pem.replaceAll('\\n','\n'));
   if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<2048)throw Error();
   const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),seconds=Math.floor(now()/1000);
   const input=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:id,iat:seconds-60,exp:seconds+540});
   jwt=input+'.'+sign('RSA-SHA256',Buffer.from(input),key).toString('base64url');
  }catch{throw unavailable('IMPACT_APP_CONFIG_INVALID','app-configuration');}
  try{
   const response=await fetchImpl(`https://api.github.com/app/installations/${environment.MC_GITHUB_APP_INSTALLATION_ID}/access_tokens`,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2026-03-10',Authorization:'Bearer '+jwt},
    body:JSON.stringify({repositories:[repository.split('/')[1]],permissions:{checks:'read'}}),
   });
   if(!response.ok){
    const limited=response.status===429||response.headers?.get?.('x-ratelimit-remaining')==='0';
    throw unavailable(limited?'IMPACT_APP_RATE_LIMITED':'IMPACT_APP_TOKEN_UNAVAILABLE','app-token',response.status);
   }
   const raw=await response.text();if(Buffer.byteLength(raw)>32768)throw Error();
   const value=JSON.parse(raw),expires=Date.parse(value.expires_at),time=now();
   if(typeof value.token!=='string'||!value.token.length||value.token.length>8192||/\s/.test(value.token)
    ||!Number.isFinite(expires)||expires-time<=120000||expires-time>3720000
    ||value.permissions?.checks!=='read'||Object.entries(value.permissions).some(([k,v])=>!['checks','metadata'].includes(k)||v!=='read')
    ||(value.repositories!==undefined&&(!Array.isArray(value.repositories)||value.repositories.length!==1||value.repositories[0]?.full_name!==repository)))throw Error();
   const entry={token:value.token,expires};cache.set(repository,entry);return entry.token;
  }catch(error){if(error.appCredential)throw error;throw unavailable('IMPACT_APP_TOKEN_UNAVAILABLE','app-token');}
 }
 return {
  async get(repository){
   if(!allowed.has(repository))throw unavailable('IMPACT_APP_SCOPE_DENIED','app-configuration');
   const entry=cache.get(repository);if(entry&&entry.expires-now()>120000)return entry.token;
   if(!pending.has(repository))pending.set(repository,mint(repository).finally(()=>pending.delete(repository)));
   return pending.get(repository);
  },
  invalidate(repository,token){if(cache.get(repository)?.token===token)cache.delete(repository);},
 };
}
