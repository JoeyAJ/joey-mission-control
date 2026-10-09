// Projection of pages already verified by the existing Owner readers. No IO.
const sameScope=(a,b)=>a&&b&&['projectId','epoch','baselineSha','contextHash'].every(k=>a[k]===b[k]);
const complete=(page,key)=>page?.afterRevision===0&&Array.isArray(page[key])&&page[key].length===page.revision&&page[key].every((row,i)=>row.revision===i+1);
const sameHashes=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((h,i)=>h===b[i]);
function boundDecision(row,proposal,result,page){
 const c=row.content,p=proposal.content.operation.payload,r=result.content.operation.payload;
 return sameScope(page,c)&&['ACCEPT','REJECT'].includes(c.decision)
  &&c.proposalId===p.proposalId&&c.proposalOperationId===proposal.operationId&&c.proposalDigest===proposal.digest&&c.acceptanceHash===p.acceptanceHash
  &&c.resultOperationId===result.operationId&&c.resultDigest===result.digest&&c.resultHash===r.resultHash
  &&c.resultQualification===r.qualification&&sameHashes(c.evidenceHashes,r.evidenceHashes)
  &&row.committedAt>=result.committedAt&&row.committedAt<p.expiresAt;
}
export function coordinatorResultStates({page,decisionPage,now=Date.now()}={}){
 const byOperation=new Map(),groups=new Map(),receipts=Array.isArray(page?.receipts)?page.receipts:[];
 const sourceValid=page?.writerQualification==='TOOL_MEDIATED_COORDINATOR_ATTESTATION'&&page.runtimeConnected===false&&Number.isSafeInteger(now);
 const decisionScopeValid=sameScope(page,decisionPage)&&decisionPage.qualification==='VERIFIED_OWNER_AAL2_DECISION'&&decisionPage.runtimeConnected===false&&decisionPage.executionAuthorized===false;
 let nextExpiry=null;
 for(const row of receipts){
  const op=row.content?.operation,id=op?.payload?.proposalId;
  if(!groups.has(id))groups.set(id,{proposals:[],results:[],rows:[]});
  const g=groups.get(id);g.rows.push(row);if(op?.kind==='proposal')g.proposals.push(row);else if(op?.kind==='result')g.results.push(row);
  const expiry=op?.kind==='proposal'?op.payload.expiresAt:null;
  if(Number.isSafeInteger(expiry)&&expiry>now)nextExpiry=Math.min(nextExpiry??expiry,expiry);
 }
 for(const [id,g]of groups){
  const proposal=g.proposals[0],result=g.results[0],p=proposal?.content.operation.payload;
  let state;
  if(!sourceValid)state='SOURCE_CONFLICT';
  else if(!complete(page,'receipts'))state='SOURCE_INCOMPLETE';
  else if(g.proposals.length!==1||g.results.length>1||p.contextHash!==page.contextHash||!Number.isSafeInteger(p.expiresAt))state='SOURCE_CONFLICT';
  else if(!decisionPage)state='SOURCE_INCOMPLETE';
  else if(!decisionScopeValid)state='SOURCE_CONFLICT';
  else{
   const decisions=decisionPage.decisions.filter(d=>d.content.proposalId===id);
   if(decisions.length>1)state='SOURCE_CONFLICT';
   else if(!result)state=decisions.length?'SOURCE_CONFLICT':!complete(decisionPage,'decisions')?'SOURCE_INCOMPLETE':p.expiresAt<=now?'EXPIRED':'AWAITING_RESULT';
   else if(result.revision<=proposal.revision||result.committedAt<proposal.committedAt||result.committedAt>=p.expiresAt||result.content.operation.payload.qualification!=='SUBMITTER_ATTESTED')state='SOURCE_CONFLICT';
   else if(decisions.length)state=boundDecision(decisions[0],proposal,result,page)?'SAVED_'+decisions[0].content.decision:'SOURCE_CONFLICT';
   else if(!complete(decisionPage,'decisions'))state='SOURCE_INCOMPLETE';
   else state=p.expiresAt<=now?'EXPIRED':'READY_TO_REVIEW';
  }
  for(const row of g.rows)byOperation.set(row.operationId,state);
 }
 return{byOperation,nextExpiry};
}

export const resultSourceWords={
 'zh-TW':{title:'成果與驗收',AWAITING_RESULT:'提案已記錄，尚無確認的回傳成果。',READY_TO_REVIEW:'成果已回傳，可準備 Joey 審閱。',EXPIRED:'提案已過期；保留成果記錄，不能提交新的決定。',SAVED_ACCEPT:'Joey 已保存接受決定。',SAVED_REJECT:'Joey 已保存拒絕決定。',SOURCE_INCOMPLETE:'本頁來源不完整，尚未確認成果或驗收狀態。',SOURCE_CONFLICT:'來源綁定不一致，成果與驗收狀態未確認。'},
 en:{title:'Results and review',AWAITING_RESULT:'Proposal recorded; no confirmed result returned yet.',READY_TO_REVIEW:'Result returned; ready to prepare Joey’s review.',EXPIRED:'Proposal expired. Result history is retained; new decisions are unavailable.',SAVED_ACCEPT:'Joey’s accept decision is saved.',SAVED_REJECT:'Joey’s reject decision is saved.',SOURCE_INCOMPLETE:'This source page is incomplete. Result or review status is unconfirmed.',SOURCE_CONFLICT:'Source bindings conflict. Result and review status are unconfirmed.'},
 ko:{title:'결과 및 검토',AWAITING_RESULT:'제안이 기록됨. 확인된 결과는 아직 없음.',READY_TO_REVIEW:'결과가 반환됨. Joey 검토 초안 준비 가능.',EXPIRED:'제안이 만료됨. 결과 이력은 유지되며 새 결정은 제출할 수 없음.',SAVED_ACCEPT:'Joey의 수락 결정이 저장됨.',SAVED_REJECT:'Joey의 거절 결정이 저장됨.',SOURCE_INCOMPLETE:'현재 출처 페이지가 불완전함. 결과 또는 검토 상태 미확인.',SOURCE_CONFLICT:'출처 연결이 일치하지 않음. 결과 및 검토 상태 미확인.'}
};
