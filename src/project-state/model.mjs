import fs from 'node:fs/promises';
import {validate} from '../api/validation.mjs';
export const stateSchema=JSON.parse(await fs.readFile(new URL('../../schemas/canonical-project-state.schema.json',import.meta.url),'utf8'));
export const stateError=(message,status=400)=>Object.assign(new Error(message),{status});
export function assertProjectState(state){
 const result=validate(stateSchema,state);if(!result.valid)throw stateError('Invalid project state: '+result.errors.join('; '));
 if(!Number.isInteger(state.metadata.revision)||state.metadata.revision<0||!Number.isInteger(state.metadata.sourceOwnerRevision))throw stateError('Invalid state revision');
 const ids=new Set();for(const key of ['missions','decisions','ideas','nextActions','sources','confirmationQueue','auditLog'])for(const item of state[key]){if(!item.id||ids.has(item.id))throw stateError('Duplicate state entity identifier');ids.add(item.id);if(item.projectId&&item.projectId!==state.id)throw stateError('Cross-project entity forbidden');}
 const missions=new Set(state.missions.map(m=>m.id)),ideas=new Set(state.ideas.map(i=>i.id)),sources=new Set(state.sources.map(s=>s.id));
 const refs=value=>{if(value.sourceRefs?.some(id=>!sources.has(id)))throw stateError('Unknown source reference');};
 for(const key of ['missions','decisions','ideas','nextActions','confirmationQueue','auditLog'])for(const item of state[key])refs(item);for(const item of Object.values(state.provenance))refs(item);
 for(const m of state.missions){if(!m.title.trim()||!Number.isInteger(m.order)||m.order<0||m.dependencies.some(id=>id===m.id||!missions.has(id))||m.linkedIdeaId&&!ideas.has(m.linkedIdeaId))throw stateError('Invalid mission links or order');}
 const visit=(id,path=new Set())=>{if(path.has(id))throw stateError('Cyclic mission dependency');const next=new Set([...path,id]);for(const dep of state.missions.find(m=>m.id===id).dependencies)visit(dep,next);};for(const id of missions)visit(id);
 for(const d of state.decisions){if(!d.title.trim()||d.missionId&&!missions.has(d.missionId)||d.selectedOption!==null&&!d.options.includes(d.selectedOption))throw stateError('Invalid decision links or selection');}
 for(const i of state.ideas)if(!i.content.trim()||i.linkedMissionId&&!missions.has(i.linkedMissionId)||i.status==='CONVERTED_TO_MISSION'&&!i.linkedMissionId)throw stateError('Invalid idea');
 for(const a of state.nextActions)if(!a.title.trim()||a.missionId&&!missions.has(a.missionId))throw stateError('Invalid next action');
 for(const collection of ['missions','decisions','ideas','nextActions','sources','confirmationQueue'])for(const item of state[collection])for(const field of ['createdAt','updatedAt','resolvedAt','timestamp'])if(item[field]!==undefined&&item[field]!==null&&!Number.isFinite(Date.parse(item[field])))throw stateError('Invalid state timestamp');
 for(const e of state.auditLog)if(e.projectId!==state.id||!Number.isFinite(Date.parse(e.timestamp))||!Number.isInteger(e.revision)||e.revision>state.metadata.revision)throw stateError('Invalid audit event');return state;
}
export const validCanonicalState=state=>{try{assertProjectState(state);return true;}catch{return false;}};
