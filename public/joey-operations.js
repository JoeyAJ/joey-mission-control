import {missingOrUnverified} from './control-semantics.js';
const labels={
 'zh-TW':{title:'操作入口',recorded:'來源記錄，不代表即時執行',snapshot:'公開唯讀快照，不代表 Mac 現況',unknown:'UNKNOWN · 尚未記錄／驗證',withheld:'私人參照已隱藏',currentMission:'目前任務',missionStatus:'記錄的工作狀態',currentAgent:'目前 Agent',lastAgent:'最後 Agent',currentModel:'目前模型',lastModel:'最後模型',lastCompletedAction:'正式完成',handoffTask:'接手工作（記錄）',machine:'機器／工作區',nextAction:'下一工作',blocker:'阻礙',approval:'批准記錄',noRequest:'沒有已記錄的待批准事項',restrictions:'既有執行限制',source:'來源與時效',asOf:'投影讀取時間',completionTime:'完成記錄時間',inspect:'查看任務／Continue',boundary:'開啟既有檢查入口；不會啟動 Agent。'},
 en:{title:'Operations',recorded:'Recorded sources; execution is not observed live',snapshot:'Public read-only snapshot; not live Mac state',unknown:'UNKNOWN · not recorded / verified',withheld:'Private reference withheld',currentMission:'Current task',missionStatus:'Recorded work state',currentAgent:'Current agent',lastAgent:'Last agent',currentModel:'Current model',lastModel:'Last model',lastCompletedAction:'Formal completion',handoffTask:'Recorded handoff task',machine:'Machine / workspace',nextAction:'Next action',blocker:'Blocker',approval:'Approval record',noRequest:'No recorded pending approval items',restrictions:'Existing execution restrictions',source:'Source and freshness',asOf:'Projection read time',completionTime:'Completion record time',inspect:'Inspect task / Continue',boundary:'Opens the existing inspection flow; does not launch an agent.'},
 ko:{title:'작업 진입점',recorded:'기록된 출처이며 실시간 실행 관찰이 아닙니다',snapshot:'공개 읽기 전용 스냅샷이며 Mac의 실시간 상태가 아닙니다',unknown:'UNKNOWN · 기록 / 검증 없음',withheld:'비공개 참조 숨김',currentMission:'현재 작업',missionStatus:'기록된 작업 상태',currentAgent:'현재 Agent',lastAgent:'마지막 Agent',currentModel:'현재 모델',lastModel:'마지막 모델',lastCompletedAction:'공식 완료',handoffTask:'기록된 인계 작업',machine:'머신 / 작업 공간',nextAction:'다음 작업',blocker:'차단 요인',approval:'승인 기록',noRequest:'기록된 승인 대기 항목 없음',restrictions:'기존 실행 제한',source:'출처와 기록 시간',asOf:'투영 읽기 시간',completionTime:'완료 기록 시간',inspect:'작업 / Continue 확인',boundary:'기존 확인 화면을 엽니다. Agent를 실행하지 않습니다.'}
};
export const operationLabels=locale=>labels[locale]||labels['zh-TW'];
// Main readouts use reconciled summaries. Original source text remains in private-safe details.
export function retainLastConfirmed(manifests,readAt){return new Map([...manifests].map(([id,m])=>[id,{...m,operations:m.operations?{...m.operations,currentConfirmed:false,refresh:{...m.operations.refresh,status:'FAILED',failedAt:readAt}}:null}]));}
export function renderOperations(manifest,{el,locale='zh-TW',readOnly=false,onInspect=()=>{},onRefresh=()=>{}}){
 const w=operationLabels(locale),r=manifest.runtime||{},o=manifest.operations,zh=locale==='zh-TW',safe=v=>typeof v==='string'&&!/\/Users\/|\/home\/|\/private\/|Bearer\s|gh[pousr]_|sk-[A-Za-z0-9]|PRIVATE KEY|(?:token|password)\s*[:=]/i.test(v)?v:w.withheld;
 const text=(zhText,enText,koText)=>zh?zhText:locale==='ko'?koText:enText;
 const panel=el('section',undefined,'joey-operations liquid-glass');panel.dataset.projectId=manifest.project_id;
 panel.append(el('h4',w.title),el('p',readOnly?w.snapshot:w.recorded,'operations-boundary'));
 if(['FAILED','PARTIAL'].includes(o?.refresh.status))panel.append(el('p',text('來源讀取失敗；下方保留上次確認記錄，目前執行狀態需重新確認。','Refresh failed; last confirmed records retained. Current execution is unconfirmed.','새로고침 실패. 이전 확인 기록을 유지하며 현재 실행은 미확인입니다.'),'operations-refresh-failed'));
 if(o?.confirmedReview){const review=el('details',undefined,'operations-confirmed-review');review.append(el('summary',text('最近確認：','Last confirmed: ','최근 확인: ')+safe(o.confirmedReview.summary)),el('p',text('歷史整理／核對成果；不是即時 Agent 完成回報。','Historical reconciliation; not a live Agent result.','과거 확인 결과이며 실시간 Agent 결과가 아닙니다.')),el('p',text('事件日期','Event date','이벤트 날짜')+' · '+o.confirmedReview.eventTime),el('p',safe(o.confirmedReview.source.reference)),el('p',o.confirmedReview.source.fingerprint));panel.append(review);}
 if(o?.facts.stage)panel.append(el('p',safe(o.facts.stage.summary||o.facts.stage.reason),'operations-stage'));
 for(const conflict of o?.conflicts||[]){const box=el('details',undefined,'operations-conflict');box.append(el('summary',safe(conflict.summary)));if(conflict.reason)box.append(el('p',safe(conflict.reason)));for(const item of conflict.sources||[])box.append(el('p',safe(typeof item==='string'?item:JSON.stringify(item))));panel.append(box);}
 const facts=el('dl',undefined,'operations-facts');const identities=el('details',undefined,'operations-identities');identities.append(el('summary',text('Agent／模型／執行狀態詳情','Agent / model / execution details','Agent / 모델 / 실행 세부 정보')));const identityFacts=el('dl',undefined,'operations-facts');identities.append(identityFacts);
 const missing={handoffTask:'接手工作來源需核對',machine:'缺少已驗證的機器心跳',currentMission:'未接入執行回報',currentAgent:'目前 Agent 未確認',currentModel:'缺執行回報中的模型',lastAgent:'完成記錄未提供 Agent',lastModel:'完成記錄未提供模型',lastCompletedAction:'未有正式完成 handoff',nextAction:'下一步來源需核對',blocker:'當前阻礙未確認',missionStatus:'目前狀態未確認'};
 for(const key of ['handoffTask','machine','currentMission','missionStatus','currentAgent','currentModel','lastAgent','lastModel','lastCompletedAction','nextAction','blocker']){
  const fact=o?.facts[key],entry=el('div',undefined,'operation-fact');entry.dataset.field=key;
  const legacyIdentity=['currentAgent','currentModel','lastAgent','lastModel'].includes(key)?r[key]:null;
  const staleCurrent=o?.refresh.status==='FAILED'&&key.startsWith('current');
  const reading=staleCurrent?text('目前狀態需重新確認','Current state needs reconfirmation','현재 상태 재확인 필요'):fact?.summary||legacyIdentity||text(missing[key],'Not confirmed; inspect missing-source details','미확인. 누락된 출처를 확인하세요');
  entry.append(el('dt',w[key]),el('dd',safe(reading)));
  const proof=el('details',undefined,'operation-source');proof.append(el('summary',w.source));
  const reason=fact?.reason||text('公開／舊快照沒有整理後的執行證據；不推測事實。','No reconciled execution evidence in this snapshot. Facts are not inferred.','스냅샷에 정리된 실행 근거가 없어 사실을 추정하지 않습니다.');
  if(!fact?.summary||key==='machine')proof.append(el('p',safe(reason)),el('p',safe(fact?.remediation||text('取得正式 handoff 或帶時間的執行回報。','Obtain a formal handoff or timestamped execution report.','공식 인계 또는 시간 기록된 실행 보고가 필요합니다.'))));
  const raw=fact?.raw||r[key];if(raw)proof.append(el('p',safe(raw)));
  const provenance=fact?.source||r.fields?.[key]?.source;for(const item of [provenance?.kind,provenance?.reference,provenance?.section,provenance?.fingerprint])if(item)proof.append(el('p',safe(item)));
  proof.append(el('p',text('事件日期','Event time','이벤트 시간')+' · '+(fact?.eventTime||text('來源未記錄','Not recorded by this source','출처에 기록 없음'))));
  if(provenance?.readAt)proof.append(el('p',w.asOf+' · '+provenance.readAt));
  entry.append(proof);(['missionStatus','currentModel','lastAgent','lastModel'].includes(key)?identityFacts:facts).append(entry);
 }
 panel.append(facts,identities);
 if(o?.repositoryEvent){const event=o.repositoryEvent,repo=el('details',undefined,'operations-repo-event');repo.append(el('summary',text('最近 repo 記錄：','Recent repository event: ','최근 저장소 기록: ')+safe(event.summary)),el('p',safe(event.raw)),el('p',event.sha),el('p',event.eventTime),el('p',text('提交記錄，不等於 Agent 完成或目前執行。','A repository event does not prove Agent completion or current execution.','커밋 기록은 Agent 완료 또는 현재 실행을 증명하지 않습니다.')));panel.append(repo);}
 const requested=o?.approval.status==='REQUEST_RECORDED'||r.approvalStatus==='AWAITING_JOEY_APPROVAL';
 panel.append(el('p',requested?text('有明確來源的待決定事項，詳見記錄。','An explicit decision request is recorded. Inspect its source.','명시적인 결정 요청이 기록되어 있습니다.'):text('未記錄已送出的待批准請求。','No submitted approval request recorded.','제출된 승인 요청 기록 없음')));
 const approvals=el('details',undefined,'operations-approval');approvals.append(el('summary',w.approval+' / '+w.restrictions));if(r.approvalStatus)approvals.append(el('p',safe(r.approvalStatus)));
 for(const item of o?.approval.items||r.approvalItems||[])for(const val of [item.what,item.why])if(val)approvals.append(el('p',safe(val)));
 for(const gate of o?.approval.gates||r.restrictions||[])approvals.append(el('p',w.restrictions+' · '+safe(gate)));
 if(manifest.project_id==='JOEY_ASSET_SYSTEM')approvals.append(el('p',text('Phase 2 需另行授權；這是文件中的限制，並非已送出請求。','Phase 2 needs separate authorization; this documented gate is not a submitted request.','Phase 2는 별도 승인이 필요하지만 제출된 요청은 아닙니다.')));
 const context=el('details',undefined,'operation-source');context.append(el('summary',w.source));for(const key of ['sourceRepo','sourceBranch','baselineSha'])if(r[key])context.append(el('p',key+' · '+safe(r[key])));
 if(o?.code)context.append(el('p',safe(o.code.productionVerification)),el('p',text('GitHub 核對讀取時間','GitHub read time','GitHub 읽기 시간')+' · '+(o.code.remoteCheck?.observedAt||w.unknown)));
 panel.append(context,approvals,el('p',w.asOf+' · '+(o?.refresh.readAt||r.lastSyncedAt||w.unknown)));
 const refresh=el('button',text('重新核對來源','Refresh sources','출처 다시 확인'),'operations-refresh button-glass');refresh.type='button';refresh.addEventListener('click',onRefresh);panel.append(refresh);
 const inspect=el('button',w.inspect,'operations-inspect button-glass');inspect.type='button';inspect.addEventListener('click',()=>onInspect(manifest.project_id));panel.append(inspect,el('small',w.boundary));return panel;
}
