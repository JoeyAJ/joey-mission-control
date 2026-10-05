import path from 'node:path';
import { randomUUID } from 'node:crypto';

const next={starting:['running','failed','stopped'],running:['waiting_for_joey','stopped','failed'],waiting_for_joey:['running','stopped','failed'],stopped:[],failed:[]};
const editable=new Set(['ai','model','workspaceId','path','repository','branch','startingCommit','currentCommit','permissionBoundary','declaredTask']);
const httpError=(message,status)=>Object.assign(new Error(message),{status});

function validateFields(input,{partial=false}={}){
  const required=['entityId','ai','model','workspaceId','path'];
  if(!partial)for(const key of required)if(typeof input[key]!=='string'||!input[key].trim())throw httpError(`${key} required`,400);
  if(input.path!==undefined&&(!path.isAbsolute(input.path)||input.path.includes('\0')))throw httpError('Session path must be absolute',400);
  for(const [key,value] of Object.entries(input))if(key!=='state'&&!editable.has(key)&&!(key==='entityId'&&!partial))throw httpError(`Unsupported session field: ${key}`,400);else if(key!=='state'&&typeof value!=='string')throw httpError(`Session ${key} must be a string`,400);
}

export class SessionService{
  constructor(store){this.store=store;}
  async start(input){validateFields(input);const now=new Date().toISOString(),record={schemaVersion:'1.0',id:randomUUID(),...input,state:'starting',createdAt:now,updatedAt:now};await this.store.update(items=>[...items,record]);return record;}
  async transition(id,state){let result;await this.store.update(items=>items.map(item=>{if(item.id!==id)return item;if(!next[item.state]?.includes(state))throw httpError(`Invalid session transition ${item.state} -> ${state}`,409);return result={...item,state,updatedAt:new Date().toISOString()};}));if(!result)throw httpError('Session not found',404);return result;}
  async update(id,patch){validateFields(patch,{partial:true});let current;if(patch.state!==undefined){current=await this.transition(id,patch.state);}const fields=Object.fromEntries(Object.entries(patch).filter(([key])=>key!=='state'));if(!Object.keys(fields).length)return current;let result;await this.store.update(items=>items.map(item=>item.id===id?(result={...item,...fields,updatedAt:new Date().toISOString()}):item));if(!result)throw httpError('Session not found',404);return result;}
  async list(){return this.store.read();}
}
