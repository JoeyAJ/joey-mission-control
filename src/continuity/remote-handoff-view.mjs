// Private text rendering only. Markdown/links/HTML remain inert source text.
const words={
 'zh-TW':{title:'遠端私人交接',source:'來源',progress:'文件記錄的進度',document:'交接 Markdown 原文',unknown:'未記錄',stale:'上次已確認來源；本次讀取未確認',automatic:'自動同步',manual:'手動讀取',unconfigured:'遠端讀取服務尚未接線',runtime:'當前 Agent／模型：未確認；文件不代表正在執行'},
 en:{title:'Private remote handoff',source:'Source',progress:'Document-reported progress',document:'Handoff Markdown source',unknown:'Not recorded',stale:'Last confirmed source; this read is unconfirmed',automatic:'Automatic sync',manual:'Manual read',unconfigured:'Remote repository service is unconfigured',runtime:'Current agent/model: unconfirmed; a document is not live execution'},
 ko:{title:'비공개 원격 인계',source:'출처',progress:'문서에 기록된 진행',document:'인계 Markdown 원문',unknown:'기록 없음',stale:'마지막 확인 출처. 이번 읽기는 미확인',automatic:'자동 동기화',manual:'수동 읽기',unconfigured:'원격 저장소 서비스 연결 전',runtime:'현재 에이전트/모델: 미확인. 문서는 실행 증거가 아님'}
};
export function renderPrivateRemoteHandoff({doc=document,view,locale='zh-TW'}={}){
 const w=words[locale]||words['zh-TW'],root=doc.createElement('section');root.dataset.remoteHandoff='private_readonly';root.style.minWidth='0';root.style.overflowWrap='anywhere';
 const add=(tag,text,parent=root)=>{const n=doc.createElement(tag);n.textContent=String(text??w.unknown);parent.append(n);return n;};
 add('h4',w.title);add('p',view?.configured?(view.automatic?w.automatic:w.manual):w.unconfigured);add('p',view?.status||'unconfigured');add('p',w.runtime);
 const previous=view?.status==='unavailable'?view.lastConfirmed:null,record=previous||view?.observation;if(!record)return root;
 if(previous)add('p',w.stale);add('p',record.status+' · '+record.freshness+' · '+record.entryMode);if(record.primaryEntryStatus==='MISSING')add('p','HANDOFF.md · MISSING');if(record.baselineChanged)add('p','BASELINE_CHANGED');
 add('h5',w.source);for(const key of ['repositoryId','requestedRef','resolvedCommitSha','path','contentSha256','readAt','documentTimestamp'])add('p',key+' · '+(record.source[key]??w.unknown));
 if(record.progress){add('h5',w.progress);for(const key of ['task','recordedStatus','summary','changes','verification','nextAction','decisionRequired','lastAgent','lastModel'])add('p',key+' · '+(record.progress[key]||w.unknown));}
 for(const conflict of record.conflicts||[])add('p',conflict);
 if(record.document!==null){const details=add('details','');add('summary',w.document,details);const pre=add('pre',record.document,details);pre.dataset.remoteHandoffSource='true';pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';}
 return root;
}
