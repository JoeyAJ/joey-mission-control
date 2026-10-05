export const PHASES=['IDEA','DISCOVERY','SPEC','BUILD','TEST','DEPLOY','MAINTAIN'];
export const STATUSES=['Active','Paused','Idea','Planned','Completed'];

function bullets(value=''){
  return value.split('\n').map(line=>line.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
}

export function approvalGates(next={}){
  const sections=next?.sections||{};
  const named=[...bullets(sections['Not Authorized Yet']),...bullets(sections['Decisions Needed From Joey'])];
  if(named.length)return named;
  return bullets(next?.text||'').filter(line=>/^(do not|await .*explicit|requires? .*approval|approve or reject)/i.test(line));
}

export function deriveLifecycle(stage='',next={}){
  const normalized=stage.toLowerCase();
  let phase=null,status=null,reason=normalized?'Conservative mapping from canonical Current Stage':'No canonical lifecycle evidence';
  if(/test|characterization|characterized/.test(normalized))phase='TEST';
  else if(/production|deployed|maintenance/.test(normalized))phase='MAINTAIN';
  else if(/build|implement/.test(normalized))phase='BUILD';
  else if(/spec|schema|prd/.test(normalized))phase='SPEC';
  else if(/discovery|investigat|research/.test(normalized))phase='DISCOVERY';
  else if(/idea/.test(normalized)){phase='IDEA';status='Idea';}
  if(phase&&!status)status='Active';
  const negationText=normalized.replaceAll('_',' ');
  const negativeCompletion=/\b(incomplete|not|never|pending|awaiting|yet|cannot)\b/.test(negationText)||/\b(isn['’]?t|wasn['’]?t|hasn['’]?t|haven['’]?t|hadn['’]?t|aren['’]?t|weren['’]?t|doesn['’]?t|didn['’]?t|won['’]?t|can['’]?t|couldn['’]?t|shouldn['’]?t|wouldn['’]?t)\b/.test(negationText);
  const positivelyComplete=/\b(completed|complete|done|finished|published)\b/.test(normalized)&&!negativeCompletion;
  if(/phase[_ ]?1[_ ]?characterized[_ ]?published/.test(normalized)&&!negativeCompletion)status='Completed';
  else if(positivelyComplete&&!/phase 2 has not started/.test(normalized))status='Completed';
  if(/phase 2 has not started|await .*approval|not authorized/.test(normalized))status='Paused';
  if(/paused|blocked/.test(normalized))status='Paused';
  return{phase,status,attention:approvalGates(next).length?'awaiting_approval':'ready_to_continue',reason};
}
