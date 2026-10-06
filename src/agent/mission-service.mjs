import {randomUUID} from 'node:crypto';
import {approvalStatuses} from './runtime.mjs';
import {lifecycle,transition} from './control.mjs';
const error=(s,status=400)=>Object.assign(new Error(s),{status});
export const validLedger=items=>Array.isArray(items)&&items.every(m=>typeof m.mission_id==='string'&&typeof m.project_id==='string'&&typeof m.task==='string'&&typeof m.assigned_agent==='string'&&typeof m.model==='string'&&/^[a-f0-9]{40}$/.test(m.baseline_sha||'')&&Number.isInteger(m.revision)&&Array.isArray(m.events)&&Array.isArray(m.tests)&&Array.isArray(m.blockers)&&m.blockers.every(v=>typeof v==='string')&&Object.hasOwn(lifecycle,m.status));
export class MissionService{
 constructor(store){this.store=store;}
 async create(input){
 const keys=['project_id','task','assigned_agent','model','baseline_sha','next_action'];
 if(Object.keys(input).some(k=>!keys.includes(k))||keys.slice(0,5).some(k=>typeof input[k]!=='string'||!input[k].trim())||!/^[a-f0-9]{40}$/.test(input.baseline_sha))throw error('Mission identity, agent, model and exact baseline required');
 const record={mission_id:randomUUID(),...input,status:'PLANNED',started_at:null,completed_at:null,accepted_at:null,result:null,resulting_commit:null,tests:[],blockers:[],approval:{required:false,status:'NO_APPROVAL_REQUIRED'},created_at:new Date().toISOString(),revision:0,events:[]};
 await this.store.update(items=>{if(items.some(m=>m.project_id===input.project_id&&!['CLOSED','ACCEPTED'].includes(m.status)))throw error('Project already has an open mission',409);return [...items,record];});return record;
 }
 async update(id,input){let result;
 const keys=['expected_revision','status','result','resulting_commit','tests','blockers','approval','next_action','check_in','handoff_ref'];
 if(Object.keys(input).some(k=>!keys.includes(k))||!Number.isInteger(input.expected_revision)||!Object.hasOwn(lifecycle,input.status))throw error('Transition and expected revision required');
 if(input.resulting_commit&&!/^[a-f0-9]{40}$/.test(input.resulting_commit))throw error('Invalid resulting commit');
 for(const key of ['tests','blockers'])if(input[key]!==undefined&&(!Array.isArray(input[key])||input[key].some(v=>typeof v!=='string')))throw error('Tests and blockers must be string arrays');
 for(const key of ['result','next_action','handoff_ref'])if(input[key]!==undefined&&typeof input[key]!=='string')throw error('Result and next action must be strings');
 if(input.approval!==undefined){const a=input.approval;if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!['required','status','joey_accepted'].includes(k))||typeof a.required!=='boolean'||!approvalStatuses.includes(a.status)||(a.joey_accepted!==undefined&&typeof a.joey_accepted!=='boolean')||a.required!==['AWAITING_JOEY_APPROVAL','BLOCKED','REJECTED'].includes(a.status))throw error('Invalid approval state');}
 if(input.check_in!==undefined&&(!input.check_in||typeof input.check_in!=='object'||Array.isArray(input.check_in)||Object.keys(input.check_in).some(k=>k!=='verified')||typeof input.check_in.verified!=='boolean'))throw error('Invalid check-in');
 if(input.status==='ACCEPTED'&&input.approval?.joey_accepted!==true)throw error('Joey acceptance required',409);
 await this.store.update(items=>items.map(m=>{if(m.mission_id!==id)return m;if(m.revision!==input.expected_revision)throw error('Stale mission revision',409);const {expected_revision,status,...patch}=input;try{result={...transition(m,status,patch),updated_at:new Date().toISOString(),revision:m.revision+1,events:[...(m.events||[]),{from:m.status,to:status,at:new Date().toISOString()}]};return result;}catch(e){throw error(e.message,409);}}));
 if(!result)throw error('Mission not found',404);return result;
 }
 async list(){return this.store.readOnly();}
}
