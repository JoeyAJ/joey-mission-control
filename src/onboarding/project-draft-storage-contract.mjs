import {validateProjectDraft,MAX_DRAFT_BYTES} from './project-draft.mjs';
export const MAX_DRAFT_REQUEST_BYTES=MAX_DRAFT_BYTES+256,MAX_DRAFT_LIST_BYTES=MAX_DRAFT_BYTES*12+4096;
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const fail=()=>{throw Object.assign(Error('DRAFT_STORAGE_PAYLOAD_INVALID'),{status:400});};
export function draftStorageRequest(action,v){
 if(action==='save'){if(!exact(v,['draft','expectedRevision'])||!Number.isSafeInteger(v.expectedRevision)||v.expectedRevision<0||v.expectedRevision>=100000)fail();const d=validateProjectDraft(v.draft);if(d.revision!==v.expectedRevision+1)fail();return {draft:d,expectedRevision:v.expectedRevision};}

 fail();
}
export function validateDraftStorageReply(action,v,request){
 if(action==='list'){if(!exact(v,['schemaVersion','qualification','drafts'])||v.schemaVersion!==1||v.qualification!=='OWNER_PRIVATE_DRAFTS'||!Array.isArray(v.drafts)||v.drafts.length>12)fail();const drafts=v.drafts.map(validateProjectDraft);if(new Set(drafts.map(d=>d.draftId)).size!==drafts.length)fail();return {schemaVersion:1,qualification:v.qualification,drafts};}
 if(action==='save'){if(!exact(v,['schemaVersion','qualification','draft'])||v.schemaVersion!==1||v.qualification!=='OWNER_PRIVATE_DRAFT_SAVED')fail();const draft=validateProjectDraft(v.draft);if(!sameDraft(draft,request.draft))fail();return {schemaVersion:1,qualification:v.qualification,draft};}

 fail();
}
export function sameDraft(a,b){const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
