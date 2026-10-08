import {workerWorkSummary} from './owner-worker-summary.mjs';
import {evidenceFreshnessMs} from './owner-worker-evidence.mjs';
const copy={
 'zh-TW':{title:'私人執行摘要',scope:'Ubuntu-1 連線 pilot',current:'目前工作',last:'上次確認完成',completed:'此 pilot 完成證據相符',missing:'尚無相符的完成證據',identity:'Agent／Model：來源未提供',read:'成功讀回時間',event:'來源事件時間',completedAt:'程序結束時間',failed:'這次讀取未確認；保留上次完成證據。',invalid:'這次來源未通過核對；保留上次完成證據。',inspect:'查看執行證據',boundary:'主機在線與 Agent 身分未確認。'},
 en:{title:'Private work summary',scope:'Ubuntu-1 connection pilot',current:'Current work',last:'Last confirmed completion',completed:'Pilot completion evidence matches',missing:'No matching completion evidence',identity:'Agent / model: not supplied by source',read:'Successful read time',event:'Source event time',completedAt:'Process exit time',failed:'This read is unconfirmed. Previous completion evidence is retained.',invalid:'This source failed validation. Previous completion evidence is retained.',inspect:'Inspect execution evidence',boundary:'Machine online status and agent identity are unconfirmed.'},
 ko:{title:'비공개 실행 요약',scope:'Ubuntu-1 연결 pilot',current:'현재 작업',last:'최근 확인된 완료',completed:'Pilot 완료 증거 일치',missing:'일치하는 완료 증거 없음',identity:'Agent / Model: 출처에서 제공하지 않음',read:'성공한 조회 시간',event:'출처 이벤트 시간',completedAt:'프로세스 종료 시간',failed:'이번 조회 미확인. 이전 완료 증거 유지.',invalid:'이번 출처 검증 실패. 이전 완료 증거 유지.',inspect:'실행 증거 보기',boundary:'기기 온라인 상태와 Agent 신원 미확인.'}
};
const states={
 'zh-TW':{NO_JOB_REPORTED:'尚無 pilot 紀錄',NO_ACTIVE_JOB_REPORTED:'讀回未顯示進行中的 pilot',READ_UNCONFIRMED:'目前狀態未確認',READBACK_EXPIRED:'讀回已過期 · 目前狀態未知',BROKER_DISABLED:'Broker 已停用',WORKER_DISABLED_OR_REVOKED:'Worker 已停用或撤銷',WAITING_UNCLAIMED:'等待領取 · 尚無執行證據',CLAIMED:'已領取 · 尚無程序事件',SPAWN_INTENT_RECORDED:'已記錄啟動意圖',RUNNING_REPORTED:'Worker 回報執行中',AWAITING_OUTCOME:'程序已結束 · 等待最終結果',CANCEL_REQUESTED:'取消已請求 · 結束未確認',FAILURE_REPORTED:'已回報失敗 · 等待最終結果',STALE:'證據已過期 · 目前狀態未知',UNCONFIRMED:'目前狀態未確認',INCONSISTENT:'證據不一致 · 目前狀態未確認'},
 en:{NO_JOB_REPORTED:'No pilot record',NO_ACTIVE_JOB_REPORTED:'No active pilot in this readback',READ_UNCONFIRMED:'Current state unconfirmed',READBACK_EXPIRED:'Readback expired; current state unknown',BROKER_DISABLED:'Broker disabled',WORKER_DISABLED_OR_REVOKED:'Worker disabled or revoked',WAITING_UNCLAIMED:'Waiting for claim; no execution evidence',CLAIMED:'Claimed; no process events',SPAWN_INTENT_RECORDED:'Spawn intent recorded',RUNNING_REPORTED:'Worker reports execution',AWAITING_OUTCOME:'Process exited; awaiting final outcome',CANCEL_REQUESTED:'Cancellation requested; exit unconfirmed',FAILURE_REPORTED:'Failure reported; awaiting final outcome',STALE:'Evidence expired; current state unknown',UNCONFIRMED:'Current state unconfirmed',INCONSISTENT:'Conflicting evidence; current state unconfirmed'},
 ko:{NO_JOB_REPORTED:'Pilot 기록 없음',NO_ACTIVE_JOB_REPORTED:'이번 조회에서 진행 중인 pilot 없음',READ_UNCONFIRMED:'현재 상태 미확인',READBACK_EXPIRED:'조회 만료; 현재 상태 알 수 없음',BROKER_DISABLED:'Broker 비활성화',WORKER_DISABLED_OR_REVOKED:'Worker 비활성화 또는 철회됨',WAITING_UNCLAIMED:'수락 대기; 실행 증거 없음',CLAIMED:'수락됨; 프로세스 이벤트 없음',SPAWN_INTENT_RECORDED:'시작 의도 기록됨',RUNNING_REPORTED:'Worker 실행 보고',AWAITING_OUTCOME:'프로세스 종료; 최종 결과 대기',CANCEL_REQUESTED:'취소 요청됨; 종료 미확인',FAILURE_REPORTED:'실패 보고; 최종 결과 대기',STALE:'증거 만료; 현재 상태 알 수 없음',UNCONFIRMED:'현재 상태 미확인',INCONSISTENT:'증거 충돌; 현재 상태 미확인'}
};
const stamp=value=>value===null?'—':new Date(value).toISOString();
export function mountOwnerWorkerSummary({doc,config,locale='zh-TW',onInspect=()=>{},now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}){
 const node=(tag,text)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const root=node('section');root.className='owner-worker-summary';root.hidden=true;
 let source=null,projection=null,readAt=null,unconfirmed=false,invalid=false,disposed=false,timer=null;
 const stop=()=>{clearTimer(timer);timer=null;};
 function render(){
  stop();if(root.hidden&&!source){root.replaceChildren();delete root.dataset.currentWork;delete root.dataset.lastConfirmed;root.dataset.workReadState='empty';return;}
  const focused=root.contains(doc.activeElement)?doc.activeElement.tagName:null,expanded=root.querySelector('details')?.open;
  const w=copy[locale]||copy['zh-TW'],labels=states[locale]||states['zh-TW'];
  const currentState=unconfirmed?'READ_UNCONFIRMED':projection&&now()>=projection.validUntil?(now()-readAt>=evidenceFreshnessMs?'READBACK_EXPIRED':'STALE'):projection?.currentState??'NO_JOB_REPORTED';
  const summary=projection;
  root.replaceChildren();root.setAttribute('aria-label',w.title);root.dataset.workReadState=invalid?'invalid':unconfirmed?'unconfirmed':source?'confirmed':'empty';
  root.dataset.currentWork=currentState;root.dataset.lastConfirmed=summary?.lastConfirmed?'COMPLETED_CONFIRMED':'NONE';
  root.append(node('small',w.title+' · '+w.scope));
  const grid=node('div');grid.className='owner-worker-summary-grid';
  const current=node('div'),last=node('div');current.append(node('h5',w.current),node('p',labels[currentState]));
  last.append(node('h5',w.last),node('p',summary?.lastConfirmed?w.completed:w.missing));grid.append(current,last);root.append(grid,node('small',w.identity));
  if(unconfirmed)root.append(node('p',invalid?w.invalid:w.failed));
  const times=node('details');times.open=expanded===true;times.append(node('summary',w.read+' · '+stamp(readAt)));
  times.append(node('p',w.event+' · '+stamp(summary?.latest?.observedAt??null)),node('p',w.completedAt+' · '+stamp(summary?.lastConfirmed?.completedAt??null)),node('p',w.boundary));root.append(times);
  const inspect=node('button',w.inspect);inspect.type='button';inspect.disabled=!source;inspect.addEventListener('click',onInspect);root.append(inspect);
  if(focused==='BUTTON')inspect.focus({preventScroll:true});else if(focused==='SUMMARY')times.firstChild.focus({preventScroll:true});
  const deadline=summary?.validUntil;if(!root.hidden&&!unconfirmed&&deadline>now()){timer=setTimer(render,deadline-now()+1);timer?.unref?.();}
 }
 return{root,update(view){if(disposed)return;if(!view){this.clear();return;}if(view===source)return;if(view!==source){
   const at=now();try{projection=workerWorkSummary({view,config,readAt:at,now:at});source=view;readAt=at;unconfirmed=false;invalid=false;}catch{unconfirmed=true;invalid=true;}
  }render();},unconfirmed(){if(disposed||!source&&root.hidden)return;unconfirmed=true;render();},setLocale(next){locale=next;render();},
  setVisible(visible){root.hidden=!visible;if(visible)render();else stop();},clear(){stop();source=null;projection=null;readAt=null;unconfirmed=false;invalid=false;root.replaceChildren();delete root.dataset.currentWork;delete root.dataset.lastConfirmed;root.dataset.workReadState='empty';},
  dispose(){if(disposed)return;this.clear();disposed=true;root.remove();}};
}
