import {assertProjectState} from './model.mjs';
// Release snapshots publish documented project facts only, never private local input.
const privateText=/(?:\/Users\/|\/home\/|\/private\/|Bearer\s|gh[pousr]_|sk-[A-Za-z0-9]|PRIVATE KEY|(?:token|password|secret)\s*[:=])/i;
export function publicProjectState(state){
 assertProjectState(state);
 if(state.ideas.length||state.decisions.length||state.auditLog.length||state.nextActions.length)throw new Error('Private owner input requires separate publication approval');
 const out=structuredClone(state);
 for(const source of out.sources){
  if(privateText.test(source.label))source.label='Local source reference withheld';
  if(source.uri&&!source.uri.startsWith('project:')){try{const url=new URL(source.uri);if(url.protocol!=='https:'||url.username||url.password||privateText.test(source.uri))source.uri=null;}catch{source.uri=null;}}
 }
 const raw=JSON.stringify(out);if(privateText.test(raw))throw new Error('Private reference in public project state');
 return assertProjectState(out);
}
