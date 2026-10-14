// One-sentence idea -> private Owner draft with neutral defaults; Joey fills the rest at formal registration.
import {validateProjectDraft} from './project-draft.mjs';
export function quickIdeaDraft(text,{now=new Date(),random=globalThis.crypto}={}){
 const idea=String(text||'').trim();if(!idea)throw Error('DRAFT_REQUIRED');
 const hex=[...random.getRandomValues(new Uint8Array(8))].map(b=>b.toString(16).padStart(2,'0')).join(''),at=now.toISOString();
 const name=idea.split(/\r?\n/)[0].replace(/\s+/g,' ').slice(0,40).trim();
 return validateProjectDraft({schemaVersion:'mc.project-draft.v1',draftId:'draft_'+hex,revision:1,createdAt:at,updatedAt:at,project:{projectId:'IDEA_'+hex.toUpperCase(),name,idea,acceptance:'',repositoryId:'',branch:'main',environment:'CODE_ONLY',deployment:'NOT_REQUIRED',previewUrl:''}});
}
