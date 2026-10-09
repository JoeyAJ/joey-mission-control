// Same-origin private transport. Session token is a header, never authority or data.
export function createRemoteHandoffClient({getAccessToken,fetchImpl=globalThis.fetch,origin=globalThis.location?.origin}={}){
 if(globalThis.location?.origin&&origin!==globalThis.location.origin)throw Error('SAME_ORIGIN_TRANSPORT_REQUIRED');
 const url=path=>new URL('/api/private/remote-handoff'+path,origin);
 async function request(path,{signal}={}){
  const token=await getAccessToken();if(typeof token!=='string'||!/^[A-Za-z0-9_.-]{20,8192}$/.test(token))throw Error('OWNER_AUTHENTICATION_REQUIRED');
  const response=await fetchImpl(url(path),{method:'GET',headers:{Authorization:'Bearer '+token},credentials:'same-origin',cache:'no-store',redirect:'error',signal});
  if(!response.ok){const error=Error(response.status===401||response.status===403?'OWNER_AUTHORIZATION_DENIED':response.status===503?'PRIVATE_SERVICE_UNAVAILABLE':'PRIVATE_READ_UNAVAILABLE');error.status=response.status;throw error;}
  const reply=await response.json();if(reply?.schemaVersion!==1||reply.privateReadOnly!==true||reply.authorization?.qualification!=='OWNER_REPOSITORY_READ_POLICY')throw Error('PRIVATE_RESPONSE_INVALID');return reply;
 }
 const query=(projectId,track)=>'?'+new URLSearchParams({project:projectId,track});
 const binding=(reply,projectId,track)=>{if(reply.authorization.projectId!==projectId||(reply.configuration?.track||reply.observation?.track||'BASELINE')!==track)throw Error('PRIVATE_SCOPE_INVALID');return reply;};
 return Object.freeze({async configuration({projectId='MISSION_CONTROL',track='BASELINE',signal}={}){return binding(await request('/config'+query(projectId,track),{signal}),projectId,track);},async read({projectId,track='BASELINE',signal}){const reply=binding(await request(query(projectId,track),{signal}),projectId,track);return reply.observation;}});
}
