import {fileActivityLabel} from './file-activity-view.mjs';
import {reportTimeNode} from '../../public/report-time.js';
export const fileNavigationWords={
 'zh-TW':{task:'回報任務',files:'任務指定檔案',manifest:'Agent 任務 manifest · metadata',unobserved:'尚無檔案觀察',observations:'具日期的觀察',history:'該檔案的讀取／變更歷史',choose:'選取檔案查看日期歷史',none:'此任務未提供檔案 manifest；只顯示來源回報事件。',limits:'Manifest 不證明檔案目前內容或即時執行；source／diff／editor／terminal 未接入。',back:'返回檔案清單'},
 en:{task:'Reported task',files:'Task-listed files',manifest:'Agent task manifest · metadata',unobserved:'No file observation yet',observations:'Dated observations',history:'Read / change history for this file',choose:'Select a file to inspect dated history',none:'This task has no file manifest; only source-reported events are available.',limits:'A manifest does not prove current file content or live execution. Source/diff/editor/terminal are unavailable.',back:'Back to file list'},
 ko:{task:'보고 작업',files:'작업 지정 파일',manifest:'Agent 작업 manifest · metadata',unobserved:'파일 관찰 없음',observations:'시간 기록 관찰',history:'이 파일의 읽기 / 변경 기록',choose:'파일을 선택하여 시간 기록 확인',none:'이 작업은 파일 manifest가 없습니다. 출처 보고 이벤트만 표시됩니다.',limits:'Manifest는 현재 내용이나 실시간 실행을 증명하지 않습니다. Source/diff/editor/terminal 미연결.',back:'파일 목록으로 돌아가기'}
};
export function markFileObservation(node,newObservation,{reducedMotion=false}={}){
 if(!newObservation)return;node.dataset.newFileObservation='true';if(!reducedMotion)node.classList.add('run-event-arrived');
}
export function renderFileNavigation({doc,projection,followState,locale='zh-TW',mode='desktop',changes=[],reducedMotion=false,onTask,onFile,onEvent}={}){
 const w=fileNavigationWords[locale]||fileNavigationWords['zh-TW'],el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const root=el('section');root.dataset.fileNavigation=mode;root.className='run-file-navigation';
 const label=el('label',w.task),select=el('select');select.setAttribute('aria-label',w.task);select.dataset.fileTaskSelect=mode;select.dataset.runSelection='task-selection';select.dataset.runControl='file-task-'+mode;
 for(const {report}of projection.runs){const option=el('option',report.featureTitle+' · '+report.agentName);option.value=report.runId;select.append(option);}select.value=followState.runId||'';select.addEventListener('change',()=>onTask(select.value));label.append(select);root.append(label,el('h5',w.files));
 const files=projection.files.filter(f=>f.runId===followState.runId),selected=files.find(f=>f.path===followState.selectedFilePath);
 if(!files.length){root.append(el('p',w.none));return root;}
 const nav=el('nav');nav.setAttribute('aria-label',w.files);root.append(nav);
 for(const f of files){const b=el('button',f.path);b.type='button';b.className='run-workbench-item run-file-item';b.dataset.fileManifestPath=f.path;b.dataset.fileManifestRun=f.runId;b.dataset.fileFreshness=f.freshness;b.dataset.runSelection=f.key;b.dataset.runControl='file-path-'+mode;b.setAttribute('aria-pressed',String(f===selected));b.addEventListener('click',()=>onFile(f.path));b.append(el('small',f.history.length?w.observations+' · '+f.history.length:w.unobserved));if(f.latest)b.append(reportTimeNode(doc,f.latest.event.activity.observedAt,{locale}));markFileObservation(b,f.history.some(e=>changes.includes(e.key)),{reducedMotion});nav.append(b);}
 if(!selected){root.append(el('p',w.choose));return root;}
 root.append(el('h5',w.history));if(!selected.history.length)root.append(el('p',w.unobserved));
 for(const row of selected.history){const a=row.event.activity,b=el('button',fileActivityLabel(a,locale)+' · #'+row.event.sequence);b.type='button';b.className='run-workbench-item';b.dataset.fileHistoryEvent=row.key;b.dataset.fileHistoryPath=selected.path;b.dataset.runSelection=row.key;b.dataset.runControl=mode==='mobile'?'explorer-mobile':'explorer';b.dataset.runEventSequence=String(row.event.sequence);b.setAttribute('aria-pressed',String(row.key===followState.selected));b.append(reportTimeNode(doc,a.observedAt,{locale}));markFileObservation(b,changes.includes(row.key),{reducedMotion});b.addEventListener('click',()=>onEvent(row.key));root.append(b);}
 return root;
}
export function renderManifestFile({doc,file,report,locale='zh-TW'}={}){
 const w=fileNavigationWords[locale]||fileNavigationWords['zh-TW'],root=doc.createElement('section');root.dataset.fileManifestDetail='true';root.dataset.activityPath=file.path;root.dataset.fileFreshness=file.freshness;
 const waiting=locale==='ko'?'관찰이 도착했습니다. 읽기 위치는 유지됩니다. 기록을 선택하세요.':locale==='en'?'Observations have arrived. Your reading position is preserved; select an observation.':'已有具日期的觀察；閱讀位置保留，請選取一筆歷史。';
 for(const [tag,text]of [['h5',w.manifest],['strong',file.path],['p',report.featureTitle],['p',file.history.length?waiting:w.unobserved],['p',w.limits]]){const n=doc.createElement(tag);n.textContent=text;root.append(n);}return root;
}
