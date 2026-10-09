// Existing Owner session, same-origin private routes. No browser persistence.
export function createTaskWorkflowClient({origin=globalThis.location?.origin,getAccessToken,fetchImpl=globalThis.fetch}={}){
 if(globalThis.location?.origin&&globalThis.location.origin!==origin)throw Error('SAME_ORIGIN_TRANSPORT_REQUIRED');
 async function request(action,{body,query='',signal}={}){
  const token=await getAccessToken();if(typeof token!=='string'||!/^[A-Za-z0-9_.-]{20,8192}$/.test(token))throw Error('OWNER_AUTHENTICATION_REQUIRED');
  const response=await fetchImpl(new URL('/api/private/task-workflow/'+action+query,origin),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json',...(!globalThis.location?{Origin:origin}:{})}:{})},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store',redirect:'error',signal});
  if(!response.ok){const value=await response.json().catch(()=>({})),code=/^[A-Z_]{3,80}$/.test(value.error)?value.error:'TASK_WORKFLOW_UNAVAILABLE';throw Object.assign(Error(code),{status:response.status});}
  const value=await response.json();if(value.schemaVersion!==1)throw Error('PRIVATE_RESPONSE_INVALID');return value;
 }
 return Object.freeze({config:options=>request('config',options),async events({taskId,cursor,signal}){const reply=await request('events',{query:'?'+new URLSearchParams({project:'MISSION_CONTROL',task:taskId,...(cursor?{cursor:JSON.stringify(cursor)}:{})}),signal});if(reply.projectId!=='MISSION_CONTROL'||reply.taskId!==taskId||!Array.isArray(reply.events)||reply.events.some(event=>event.projectId!=='MISSION_CONTROL'||event.taskId!==taskId))throw Error('PRIVATE_SCOPE_INVALID');return reply;},startCheck:body=>request('start-check',{body}),registerAgent:body=>request('register-agent',{body}),importSummary:body=>request('import',{body}),handoff:body=>request('handoff',{body})});
}
