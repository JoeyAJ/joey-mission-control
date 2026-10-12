// Immutable Agent attestation; a match does not confer acceptance or execution.
import {validateDevelopmentTask,canonicalTaskJson} from './development-task.mjs';
import {browserContextDigest} from '../continuity/browser-context-digest.mjs';
export const TASK_REQUIREMENTS_VERSION='mc.task-requirements.v1';
export function validateTaskRequirements(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).length!==3||!['schemaVersion','revision','requestDigest'].every(k=>Object.hasOwn(value,k))||Object.values(Object.getOwnPropertyDescriptors(value)).some(d=>!Object.hasOwn(d,'value'))||value.schemaVersion!==TASK_REQUIREMENTS_VERSION||!Number.isSafeInteger(value.revision)||value.revision<1||value.revision>100000||typeof value.requestDigest!=='string'||!/^[a-f0-9]{64}$/.test(value.requestDigest))throw Error('TASK_REQUIREMENTS_INVALID');
 return structuredClone(value);
}
export function taskRequirementsPayload(task,options={}){const t=validateDevelopmentTask(task,options);return Object.fromEntries(['schemaVersion','projectId','track','taskId','revision','request'].map(k=>[k,t[k]]));}
export const taskRequirementsKey=(task,options={})=>canonicalTaskJson(taskRequirementsPayload(task,options));
export async function createTaskRequirements(task,{digest=browserContextDigest,scopeAuthority=null}={}){const payload=taskRequirementsPayload(task,{scopeAuthority});return validateTaskRequirements({schemaVersion:TASK_REQUIREMENTS_VERSION,revision:payload.revision,requestDigest:await digest(payload)});}
export function taskRequirementsStatus(reported,current){if(reported===undefined||reported===null)return 'LEGACY_UNBOUND';const r=validateTaskRequirements(reported);if(!current)return 'UNCONFIRMED';const c=validateTaskRequirements(current);return r.revision===c.revision&&r.requestDigest===c.requestDigest?'MATCH':'MISMATCH';}

export const taskRequirementsQualification=(reported,current)=>({MATCH:'EXACT_TASK_REQUIREMENTS_MATCH',MISMATCH:'HISTORICAL_TASK_REQUIREMENTS_MISMATCH',LEGACY_UNBOUND:'LEGACY_TASK_REQUIREMENTS_UNBOUND',UNCONFIRMED:'TASK_REQUIREMENTS_UNCONFIRMED'})[taskRequirementsStatus(reported,current)];
