// Only authorized in-memory filtered claims enter this view. No snapshots or storage.
export const ownerContextWords={
 'zh-TW':{title:'私人專案資料',withheld:'私人資料尚未提供',read:'讀取私人專案資料',ready:'私人資料可讀取',loaded:'私人資料已讀取',reading:'正在讀取私人資料',denied:'私人讀取尚未確認；未顯示資料',verified:'身分已驗證，可讀取已授權的私人專案資料。',note:'來源記錄供私人讀取；決策、Agent 寫入與 runtime 尚未開啟。',unknown:'尚未記錄',purpose:'目的',stage:'來源階段',lastConfirmedCompletion:'來源完成記錄',nextAction:'下一步',blockerApproval:'阻擋／批准記錄',approvalSource:'批准來源',latestTrustedBaseline:'來源 baseline',qualification:'來源資格'},
 en:{title:'Private project context',withheld:'Private data withheld',read:'Read private project context',ready:'Private data ready to read',loaded:'Private data loaded',reading:'Reading private data',denied:'Private read not confirmed; data is withheld',verified:'Identity verified. You can read the authorized private project context.',note:'Recorded sources for private reading. Decisions, agent writes, and runtime remain closed.',unknown:'Not recorded',purpose:'Purpose',stage:'Recorded stage',lastConfirmedCompletion:'Recorded completion',nextAction:'Next action',blockerApproval:'Blocker / approval record',approvalSource:'Approval source',latestTrustedBaseline:'Recorded baseline',qualification:'Source qualification'},
 ko:{title:'비공개 프로젝트 자료',withheld:'비공개 자료 제공 전',read:'비공개 프로젝트 자료 읽기',ready:'비공개 자료 읽기 가능',loaded:'비공개 자료 읽기 완료',reading:'비공개 자료 읽는 중',denied:'비공개 읽기 미확인. 자료를 표시하지 않음',verified:'본인 확인 완료. 승인된 비공개 프로젝트 자료를 읽을 수 있습니다.',note:'비공개 읽기용 출처 기록입니다. 결정, 에이전트 쓰기, runtime은 비활성 상태입니다.',unknown:'기록 없음',purpose:'목적',stage:'출처 단계',lastConfirmedCompletion:'출처 완료 기록',nextAction:'다음 작업',blockerApproval:'차단 / 승인 기록',approvalSource:'승인 출처',latestTrustedBaseline:'출처 baseline',qualification:'출처 자격'}
};
export function renderOwnerContext({doc=document,claims,locale='zh-TW'}={}){
 const w=ownerContextWords[locale]||ownerContextWords['zh-TW'],root=doc.createElement('section');root.className='owner-private-context';root.dataset.privateContext='authorized_readonly';
 const add=(tag,value)=>{const n=doc.createElement(tag);n.textContent=value;root.append(n);return n;};add('h4',w.title);add('p',w.note);
 for(const key of ['purpose','stage','lastConfirmedCompletion','nextAction','blockerApproval','approvalSource','latestTrustedBaseline']){
  const claim=claims?.claims?.[key];add('h5',w[key]);add('p',claim?.value==null?w.unknown:typeof claim.value==='string'?claim.value:JSON.stringify(claim.value));if(claim?.verificationStatus)add('small',w.qualification+' · '+claim.verificationStatus);
 }
 return root;
}
