import {canonicalEvidence,missingOrUnverified,noAction,actionableDecision,verifiedDecisionItems} from './control-semantics.js';
import {t,getLocale} from './i18n.js';
import {REVIEWED_SUMMARIES} from './source-summaries.js';
export function sourceLines(raw){return String(raw||'').split('\n').map(line=>line.replace(/^[-*]\s*/, '').trim()).filter(Boolean);}
export function concise(raw,limit=110){const cleaned=String(raw||'').replace(/[`*_]/g,'').replace(/\s+/g,' ').trim();return cleaned.length>limit?cleaned.slice(0,limit-1)+'…':cleaned;}
export function managementSummary(raw,locale=getLocale()){
  const lines=sourceLines(raw),key=REVIEWED_SUMMARIES[raw]||(lines.length===1?REVIEWED_SUMMARIES[lines[0]]:null);
  if(lines.length>1&&!key)return t('summary.unmapped',{},locale);
  const summary=key?t(key,{},locale):locale==='en'?concise(lines[0]):/[㐀-鿿가-힯]/.test(lines[0]||'')?concise(lines[0]):t('summary.unmapped',{},locale);
  return summary+(lines.length>1?t('summary.more',{count:lines.length-1},locale):'');
}
export function missingLabel(claim,locale=getLocale()){
  return t(`missing.${claim?.missingReason||'unknown'}`,{},locale);
}
export function attentionItems(project){
  const items=[];
  const add=(type,issue)=>items.push({type,issue});
  for(const line of sourceLines(project.blocker?.value)) { const issue={...project.blocker,value:line}; if(!noAction(line)&&!missingOrUnverified(line))add(canonicalEvidence(issue)?'blocker':'warning',issue); }
  for(const issue of project.management?.approvals||[]) { if(!actionableDecision(issue)&&!noAction(issue.value))add(canonicalEvidence(issue)&&!missingOrUnverified(issue.value)?'blocker':'warning',issue); }
  for(const issue of project.management?.decisions||[])if(!actionableDecision(issue))add('warning',{...issue,decisionCandidate:true});
  for(const decision of verifiedDecisionItems(project))items.push({type:'decision',issue:decision.claim,decision});
  // Explicit approval wording is a presentation category, never an added execution permission.
  // Approval words alone remain restrictions, never orphan decision badges.
  for(const conflict of project.conflicts||[])add('warning',{value:conflict.message,classification:conflict.classification||'unknown',source:conflict.source|| (conflict.kind==='handoff_conflict'?null:project.workspaceObservation?.source)||null});
  for(const field of ['version','currentTask','lastAI','model','lastCompleted','nextAction','blocker'])if(project[field]?.value==='Unknown')add('warning',{...project[field],field});
  const git=project.workspaceObservation||{};
  if(!git.observedAt||Date.now()-Date.parse(git.observedAt)>300000)add('warning',{value:'Workspace observation unavailable',classification:'unknown',source:git.source||null,missingReason:'source_unavailable'});
  if(!project.sourceFingerprints?.length)add('warning',{value:'Source fingerprint set is incomplete',classification:'unknown',source:null,missingReason:'source_unavailable'});
  return items;
}

export function controlFlags(project){const items=attentionItems(project);return {approval:items.some(x=>x.type==='approval'),decision:items.some(x=>x.type==='decision'),blocker:items.some(x=>x.type==='blocker'),missing:items.some(x=>x.type==='warning'),noAction:items.length===0&&canonicalEvidence(project.blocker)&&noAction(project.blocker.value)};}
