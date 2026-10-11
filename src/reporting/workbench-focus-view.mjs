import {renderSelectedTaskSummary} from './selected-task-summary.mjs';

const words={
 'zh-TW':{project:'目前專案',agent:'回報 Agent',task:'所選任務',details:'詳情',unknown:'目前來源未確認',empty:'尚無 Agent 開工回報'},
 en:{project:'Current project',agent:'Reported Agent',task:'Selected task',details:'Details',unknown:'Current source unconfirmed',empty:'No Agent startup report'},
 ko:{project:'현재 프로젝트',agent:'보고 Agent',task:'선택 작업',details:'상세',unknown:'현재 출처 미확인',empty:'Agent 시작 보고 없음'}
};
const element=(doc,tag,text,cls)=>{const node=doc.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};

// Reuse the existing qualified task brief. Only its placement/disclosure changes.
export function renderWorkbenchFocus({doc=document,locale='zh-TW',projectName,scopeLabel,...input}={}){
 const brief=renderSelectedTaskSummary({doc,locale,...input});if(brief.hidden)return brief;
 const w=words[locale]||words['zh-TW'],el=(tag,text,cls)=>element(doc,tag,text,cls);
 brief.classList.add('run-workbench-focus-brief');
 const disclosure=brief.querySelector('.selected-task-title-disclosure'),control=disclosure.querySelector('summary');
 const heading=el('h4',null,'run-focus-heading'),field=(label,value,cls)=>{const box=el('span',null,'run-focus-field');box.append(el('small',label,'run-focus-label'),el('span',value,cls));return box;};
 const agent=brief.querySelector('.selected-task-agent'),title=brief.querySelector('.selected-task-title');
 heading.append(field(w.project,projectName||input.projectId,'run-focus-project'),field(w.agent,agent.textContent,'selected-task-agent'),field(w.task,title.textContent,'selected-task-title'),el('span',w.details,'run-focus-more'));
 heading.firstElementChild.append(el('small',scopeLabel,'run-focus-scope'));
 control.replaceChildren(heading);control.dataset.runSelection=brief.dataset.selectedTaskRun;control.dataset.runControl='focus';
 agent.remove();brief.querySelector(':scope > small')?.remove();
 const delivery=brief.querySelector('.selected-task-delivery'),blocker=brief.querySelector('.selected-task-blocker'),body=el('div',null,'run-focus-details');
 for(const child of [...brief.children])if(child!==disclosure&&child!==delivery&&child!==blocker)body.append(child);
 disclosure.append(body);brief.replaceChildren(disclosure,delivery);if(blocker)brief.append(blocker);
 return brief;
}

// Project identity is public; no cached task/Agent is shown while sources are unknown.
export function renderWorkbenchFocusPlaceholder({doc=document,locale='zh-TW',projectName,projectId,state='unconfirmed'}={}){
 const w=words[locale]||words['zh-TW'],root=element(doc,'div',null,'run-focus-placeholder');
 root.append(element(doc,'strong',projectName||projectId,'run-focus-project'),element(doc,'span',state==='empty'?w.empty:w.unknown));
 return root;
}
