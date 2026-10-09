import {projectEntryInstructions,projectEntryUrl} from './project-entry-client.mjs';
const words={
 en:{title:'Project takeover entry',read:'Read verified entry',copy:'Copy takeover instructions',details:'View entry documents',loading:'Reading private entry…',idle:'Sign in to read the verified project entry.',unavailable:'The private entry could not be confirmed. Check sign-in and retry.',scope:'Connector-verified snapshot; the website cannot read this repository’s full content.',stage:'Documented stage',status:'Acceptance state',version:'Observed version',time:'Source checked',developer:'Last development Agent',unknown:'Not explicitly recorded',next:'Recorded next steps',branches:'Separate branches',copied:'Takeover instructions copied.',fallback:'Select and copy the instructions below.',changed:'The entry changed. Review it before copying again.'},
 'zh-TW':{title:'專案接手入口',read:'讀取已驗證入口',copy:'複製接手指令',details:'查看入口文件',loading:'正在讀取私人入口…',idle:'登入後可讀取已驗證專案入口。',unavailable:'私人入口尚未確認；請確認登入後重試。',scope:'Connector 已核實的版本快照；網站尚無此 repo 完整內容的讀取權限。',stage:'文件記錄階段',status:'驗收狀態',version:'已觀察版本',time:'來源核對時間',developer:'最後開發 Agent',unknown:'未明確記錄',next:'文件記錄的下一步',branches:'獨立分支',copied:'接手指令已複製。',fallback:'請選取並複製下方接手指令。',changed:'入口版本已變更，請確認後再複製。'},
 ko:{title:'프로젝트 인계 시작',read:'검증된 시작 문서 읽기',copy:'인계 지침 복사',details:'시작 문서 보기',loading:'비공개 시작 문서 확인 중…',idle:'로그인 후 검증된 프로젝트 시작 문서를 읽을 수 있습니다.',unavailable:'비공개 시작 문서를 확인하지 못했습니다. 로그인을 확인하고 다시 시도하세요.',scope:'Connector에서 검증한 스냅샷입니다. 웹사이트는 이 저장소 전체 내용을 읽을 수 없습니다.',stage:'문서에 기록된 단계',status:'검수 상태',version:'확인한 버전',time:'출처 확인 시각',developer:'마지막 개발 Agent',unknown:'명시적 기록 없음',next:'문서에 기록된 다음 단계',branches:'별도 브랜치',copied:'인계 지침을 복사했습니다.',fallback:'아래 지침을 선택하여 복사하세요.',changed:'시작 문서가 변경되었습니다. 검토 후 다시 복사하세요.'}
};
const stateNames={
 en:{UNIFIED_CURRENT_HANDOFF_MISSING:'Current unified handoff missing',AUTHENTICATED_AND_DEVICE_ACCEPTANCE_INCOMPLETE:'Authenticated and device acceptance incomplete',CURRENT_HANDOFF_AND_NEXT_SLICE_NOT_RECORDED:'Current handoff and next slice not recorded',ACCEPTED_BASELINE_SEPARATE_FROM_UNIVERSITY_CANDIDATE:'Accepted mother baseline; University candidate awaits acceptance'},
 'zh-TW':{UNIFIED_CURRENT_HANDOFF_MISSING:'最新統一交接尚未記錄',AUTHENTICATED_AND_DEVICE_ACCEPTANCE_INCOMPLETE:'真實登入與裝置驗收尚未完成',CURRENT_HANDOFF_AND_NEXT_SLICE_NOT_RECORDED:'最新交接與下一段尚未記錄',ACCEPTED_BASELINE_SEPARATE_FROM_UNIVERSITY_CANDIDATE:'母庫 baseline 已接受；大學候選仍待驗收'},
 ko:{UNIFIED_CURRENT_HANDOFF_MISSING:'최신 통합 인계 기록 없음',AUTHENTICATED_AND_DEVICE_ACCEPTANCE_INCOMPLETE:'실제 로그인 및 기기 검수 미완료',CURRENT_HANDOFF_AND_NEXT_SLICE_NOT_RECORDED:'최신 인계 및 다음 개발 범위 기록 없음',ACCEPTED_BASELINE_SEPARATE_FROM_UNIVERSITY_CANDIDATE:'승인된 원본 기준; University 후보 검수 대기'}
};
const timeWords={
 'zh-TW':{observed:'來源核對時間',read:'此次 snapshot 讀取時間',updated:'文件更新時間',freshness:'最後已知 snapshot；最新 repo 版本未重新核對。'},
 en:{observed:'Source checked time',read:'This snapshot read time',updated:'Document update time',freshness:'Last known snapshot; latest repository version has not been rechecked.'},
 ko:{observed:'출처 확인 시각',read:'이번 스냅샷 읽기 시각',updated:'문서 갱신 시각',freshness:'마지막 확인 스냅샷입니다. 최신 저장소 버전은 재확인되지 않았습니다.'}
};
export function mountProjectEntryView({doc=document,client,locale='zh-TW',now=Date.now}={}){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;},root=el('section'),title=el('h4'),scope=el('p'),status=el('p'),read=el('button'),copy=el('button'),body=el('div'),packet=el('pre');
 root.className='owner-task-workflow';root.dataset.projectTakeover='private';root.hidden=true;read.type=copy.type='button';read.dataset.projectEntryAction='read';copy.dataset.projectEntryAction='copy';status.setAttribute('role','status');packet.dataset.projectEntryPacket='true';packet.style.whiteSpace='pre-wrap';packet.style.overflowWrap='anywhere';packet.tabIndex=0;packet.hidden=true;root.append(title,scope,read,copy,status,body,packet);
 let enabled=false,project=null,reply=null,state='idle',busy=false,generation=0,abort=null,timer=null,disposed=false,metadataReadAt=null;
 const clear=()=>{generation++;abort?.abort();abort=null;clearTimeout(timer);reply=null;metadataReadAt=null;busy=false;state='idle';body.replaceChildren();packet.textContent='';packet.hidden=true;};
 function paint(){const w=words[locale]||words.en;title.textContent=w.title;scope.textContent=w.scope;read.textContent=w.read;copy.textContent=w.copy;read.disabled=busy;copy.disabled=busy||!reply;root.hidden=!enabled;status.textContent=w[state]||'';if(!reply)return;
  const e=reply.entry;body.replaceChildren();for(const [key,value]of [['version',e.branch+' · '+e.commitSha],['stage',e.version],['status',(stateNames[locale]||stateNames.en)[e.status]],['time',e.observedAt],['developer',w.unknown],['next',e.nextSteps]]){const p=el('p');p.append(el('strong',w[key]+' · '),el('span',value));p.style.overflowWrap='anywhere';body.append(p);}
  const tw=timeWords[locale]||timeWords.en;for(const [key,label,value]of [['readAt',tw.read,metadataReadAt],['documentTimestamp',tw.updated,w.unknown],['freshness',tw.freshness,'LATEST_NOT_RECHECKED']]){const p=el('p',label+' · '+value);p.dataset.projectEntryTime=key;p.style.overflowWrap='anywhere';body.append(p);}
  const details=el('details');details.append(el('summary',w.details));const list=el('ul');for(const d of e.documents){const a=el('a',d.path+' · '+d.kind);a.href=projectEntryUrl(e,d.path);a.rel='noreferrer';a.style.overflowWrap='anywhere';const li=el('li');li.append(a);list.append(li);}details.append(list);
  for(const b of e.branches){const branch=el('p',w.branches+' · '+b.name+' · '+b.commitSha+' · '+b.qualification);branch.style.overflowWrap='anywhere';details.append(branch);for(const d of b.documents||[]){const a=el('a',d.path+' · '+d.kind);a.href=projectEntryUrl(e,d.path,b.commitSha);a.rel='noreferrer';a.style.overflowWrap='anywhere';const p=el('p');p.append(a);details.append(p);}}
  for(const note of e.notes)details.append(el('p',note));body.append(details);
 }
 const current=(g,p)=>!disposed&&enabled&&!doc.hidden&&g===generation&&p===project;
 function accept(value){reply=value;metadataReadAt=new Date(now()).toISOString();clearTimeout(timer);timer=setTimeout(()=>{clear();state='unavailable';paint();},Math.max(0,value.expiresAt-now()+1));}
 async function load(copyRequested=false){if(!enabled||busy||disposed)return;const g=++generation,p=project,previous=reply;busy=true;state='loading';packet.textContent='';packet.hidden=true;abort=new AbortController();paint();
  try{const value=await client.read(p,{signal:abort.signal});if(!current(g,p))return;if(value.expiresAt<=now())throw Error('ENTRY_EXPIRED');accept(value);
   if(copyRequested&&previous&&JSON.stringify(previous.entry)!==JSON.stringify(value.entry)){state='changed';return;}
   if(copyRequested){const text=projectEntryInstructions(value.entry);if(!current(g,p)||value.expiresAt<=now())return;
    try{if(!globalThis.navigator?.clipboard?.writeText)throw Error();await globalThis.navigator.clipboard.writeText(text);if(current(g,p)&&value.expiresAt>now())state='copied';}
    catch{if(current(g,p)&&value.expiresAt>now()){packet.textContent=text;packet.hidden=false;state='fallback';}}
   }else state='idle';
  }catch{if(current(g,p)){clear();state='unavailable';paint();}}
  finally{if(current(g,p)){busy=false;paint();}}
 }
 read.addEventListener('click',()=>void load());copy.addEventListener('click',()=>void load(true));
 return Object.freeze({root,update(next){const changed=project!==next.projectId;locale=next.locale||locale;if(changed||!next.enabled){clear();project=next.projectId;enabled=next.enabled===true;paint();if(enabled)void load();return;}const activating=!enabled;enabled=next.enabled===true;paint();if(activating)void load();},clear(){clear();paint();},dispose(){disposed=true;enabled=false;clear();paint();}});
}
