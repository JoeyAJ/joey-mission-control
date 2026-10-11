import {canonicalTaskJson,validateDevelopmentTask,sameTask,reviseDevelopmentTask,MAX_TASKS} from './development-task.mjs';
const equalRequest=(a,b)=>a?.projectId===b?.projectId&&a?.track===b?.track&&canonicalTaskJson(a?.request)===canonicalTaskJson(b?.request);
export function createTaskCloudReconciliation({now=Date.now}={}){
 let remote=new Map(),pending=new Map(),status='NOT_CONNECTED';const conflicts=new Map(),cloudBacked=new Set();
 const recordConflict=(id,revision=remote.get(id)?.revision||null)=>{conflicts.set(id,{taskId:id,remoteRevision:revision});status='CONFLICT';};
 const conflictError=id=>{recordConflict(id);throw Object.assign(Error('TASK_REVISION_CONFLICT'),{status:409});};
 const settled=next=>{status=conflicts.size?'CONFLICT':next;};
 return {
  clear(){remote.clear();pending.clear();conflicts.clear();cloudBacked.clear();status='NOT_CONNECTED';},
  unavailable(){status='UNAVAILABLE';},
  snapshot(tasks,id){return {status,conflict:structuredClone(conflicts.get(id)||null),selectedCloudBacked:cloudBacked.has(id),selectedConfirmed:['AVAILABLE','SAVED','CONFLICT'].includes(status)&&!conflicts.has(id)&&Boolean(id&&sameTask(remote.get(id),tasks.find(t=>t.taskId===id)))};},
  async refresh({client,signal,check,tasks,replace=null,scope=null}){
   let reply;try{reply=await client.list({signal});check();}catch(e){status='UNAVAILABLE';throw e;}
   if(reply.persistence!=='OWNER_RPC_AVAILABLE'){status='NOT_CONNECTED';remote.clear();pending.clear();return {tasks,persistence:reply.persistence};}
   const latest=new Map(reply.tasks.filter(t=>!scope||t.projectId===scope.projectId&&t.track===scope.track).map(t=>[t.taskId,validateDevelopmentTask(t)])),merged=[...tasks];
   if(replace&&!latest.has(replace))throw Error('TASK_CLOUD_RECORD_MISSING');
   for(const [id,t]of latest){const index=merged.findIndex(v=>v.taskId===id),old=remote.get(id);cloudBacked.add(id);
    if(index<0){if(merged.length>=MAX_TASKS)throw Error('TASK_CAPACITY');merged.push(t);}
    else if(id===replace){merged[index]=t;conflicts.delete(id);}
    else if(!sameTask(t,merged[index])&&(!old||!sameTask(old,t)))recordConflict(id,t.revision);
   }
   for(const t of tasks)if(cloudBacked.has(t.taskId)&&!latest.has(t.taskId))recordConflict(t.taskId,null);
   remote=latest;settled('AVAILABLE');return {tasks:merged,persistence:reply.persistence};
  },
  async save({client,signal,check,task}){
   const reply=await client.list({signal});check();if(reply.persistence!=='OWNER_RPC_AVAILABLE'){status='NOT_CONNECTED';throw Error('TASK_STORAGE_NOT_CONNECTED');}
   const latest=reply.tasks.find(t=>t.taskId===task.taskId),retry=pending.get(task.taskId);
   if(retry&&sameTask(latest,retry.request.task)){remote.set(task.taskId,latest);cloudBacked.add(task.taskId);pending.delete(task.taskId);if(equalRequest(task,retry.local)){conflicts.delete(task.taskId);settled('SAVED');return structuredClone(latest);}}
   if(conflicts.has(task.taskId))conflictError(task.taskId);const baseline=remote.get(task.taskId);
   if(latest&&sameTask(latest,task)){remote.set(task.taskId,latest);cloudBacked.add(task.taskId);settled('SAVED');return structuredClone(latest);}
   if(latest&&(!baseline||!sameTask(latest,baseline))||!latest&&baseline)conflictError(task.taskId);
   const candidate=latest?reviseDevelopmentTask(latest,task.request,{now:Math.max(now(),Date.parse(task.updatedAt))}):{...task,revision:1},request={task:candidate,expectedRevision:latest?.revision||0};pending.set(task.taskId,{request,local:task});
   try{const ack=await client.save(request,{signal});check();remote.set(task.taskId,ack.task);cloudBacked.add(task.taskId);pending.delete(task.taskId);conflicts.delete(task.taskId);settled('SAVED');return ack.task;}
   catch(e){check();if(e.status===409)conflictError(task.taskId);status='UNCONFIRMED_WRITE';throw e;}
  }
 };
}
