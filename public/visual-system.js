import {lastAgentGroups} from './phase-summary.js';
// Display aliases only: no project-state inference or runtime availability inference.
export function semanticStatus(state){return ({COMPLETED:'completed',DEVELOPING:'progress',WAITING:'waiting',IN_PROGRESS:'progress',ACTIVE:'working',WORKING:'working',AWAITING_JOEY_DECISION:'waiting',AWAITING_JOEY_CONFIRMATION:'waiting',AWAITING_ACCEPTANCE:'waiting',WAITING_JOEY:'waiting',TECHNICAL_BLOCKER:'blocked',BLOCKED:'blocked',ERROR:'blocked',PAUSED:'paused',DEFERRED:'paused',PLANNING:'planned',PLANNED:'planned',NOT_STARTED:'planned',IDEA:'planned',OPTIONAL:'planned',ONLINE:'ready',READY:'ready'})[state]||'unknown';}
export function applySemantic(node,state){node.dataset.semantic=semanticStatus(state);return node;}
export function brandEye(doc){const box=doc.createElement('span');box.className='brand-eye';box.setAttribute('aria-hidden','true');const image=doc.createElement('img');image.src='/brand-eye-source.png';image.alt='';image.draggable=false;box.append(image);return box;}
export function lineIcon(doc,name){
 const paths={joey:'M8 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',dashboard:'M5 7h14v12H5zM9 3v4m6-4v4M9 11h6m-6 4h6',inbox:'M3 5h18v14H3zM3 5l9 8 9-8',workspaces:'M3 7h7l2-3h9v16H3z',handoffs:'M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5',project:'M12 3l8 4v10l-8 4-8-4V7zM9 11h6m-3-3v8',search:'M16 16l5 5M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14',settings:'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',plus:'M12 5v14M5 12h14',arrow:'M4 12h16m-6-6l6 6-6 6'};
 if(!doc.createElementNS){const fallback=doc.createElement('span');fallback.className='line-icon';return fallback;}
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','line-icon');svg.setAttribute('aria-hidden','true');const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[name]||paths.project);svg.append(path);return svg;
}
// One delegated listener and at most one queued frame across all cards. No render/state update.
export function initLiquidInteraction(root,{media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),raf=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame}={}){
 let frame=null,pending=null,active=null;
 const reset=()=>{if(frame!==null)cancel?.(frame);frame=null;pending=null;if(active){active.style.removeProperty('--mouse-x');active.style.removeProperty('--mouse-y');active.classList.remove('liquid-tracking');}active=null;};
 const move=event=>{if(media?.matches||event.pointerType==='touch'){reset();return;}const target=event.target.closest?.('.liquid-glass');if(!target||!root.contains(target)){reset();return;}if(active!==target){reset();active=target;}pending={x:event.clientX,y:event.clientY};if(frame!==null)return;frame=raf(()=>{frame=null;if(!active||!pending||media?.matches){reset();return;}const r=active.getBoundingClientRect();active.style.setProperty('--mouse-x',`${pending.x-r.left}px`);active.style.setProperty('--mouse-y',`${pending.y-r.top}px`);active.classList.add('liquid-tracking');});};
 const out=event=>{if(active&&!active.contains(event.relatedTarget))reset();};
 root.addEventListener('pointermove',move,{passive:true});root.addEventListener('pointerout',out,{passive:true});media?.addEventListener?.('change',reset);
 return()=>{reset();root.removeEventListener('pointermove',move);root.removeEventListener('pointerout',out);media?.removeEventListener?.('change',reset);};
}
const chrome={
 'zh-TW':{subtitle:'AI 專案指揮中心',utility:'Joey · 設定',search:'搜尋專案',noResults:'沒有符合的專案',navigation:'導航',lifecycle:'專案生命週期',fleet:'AI AGENT FLEET',unknown:'狀態未知',unrecorded:'未記錄生命週期',add:'新增專案',addUnavailable:'新增專案入口尚未提供；目前僅管理既有四個專案',projectStatus:'任務控制',projectAction:'查看完整內容',phaseVisual:'目前階段定位示意；非即時掃描',legend:'里程碑狀態',completed:'已完成',progress:'進行中',planned:'尚未開始',waiting:'待確認／驗收',unknownLabel:'未知'},
 en:{subtitle:'AI PROJECT COMMAND CENTER',utility:'Joey · Settings',search:'Search projects',noResults:'No matching projects',navigation:'Navigation',lifecycle:'Project lifecycle',fleet:'AI AGENT FLEET',unknown:'Runtime unknown',unrecorded:'Lifecycle not recorded',add:'Add project',addUnavailable:'Project creation is not available; only the four existing projects are managed',projectStatus:'Project status',projectAction:'View full content',phaseVisual:'Phase location illustration; not a live scan',legend:'Milestone states',completed:'Completed',progress:'In progress',planned:'Not started',waiting:'Confirmation / acceptance',unknownLabel:'Unknown'},
 ko:{subtitle:'AI 프로젝트 지휘 센터',utility:'Joey · 설정',search:'프로젝트 검색',noResults:'일치하는 프로젝트 없음',navigation:'탐색',lifecycle:'프로젝트 수명주기',fleet:'AI AGENT FLEET',unknown:'상태 미확인',unrecorded:'수명주기 미기록',add:'프로젝트 추가',addUnavailable:'프로젝트 생성은 아직 제공되지 않습니다. 기존 네 프로젝트만 관리합니다',projectStatus:'프로젝트 상태',projectAction:'전체 내용 보기',phaseVisual:'현재 단계 위치 표현; 실시간 스캔 아님',legend:'단계 상태',completed:'완료',progress:'진행 중',planned:'미시작',waiting:'확인 / 검수 대기',unknownLabel:'미확인'}
};
export const visualLabels=locale=>chrome[locale]||chrome['zh-TW'];
export function initVisualChrome({doc,onNavigate,onProjectChoose,navLabel}){
 const header=doc.querySelector('body>header'),brand=header.querySelector('.brand');brand.prepend(brandEye(doc));const tagline=doc.createElement('p');tagline.className='command-tagline';brand.append(tagline);
 const navigation=doc.createElement('div');navigation.className='top-command-nav';navigation.setAttribute('role','navigation');const links=[];
 for(const id of ['joey','dashboard','handoffs','project']){const button=doc.createElement('button');button.type='button';button.dataset.view=id;button.className='mc-button button-ghost';const label=doc.createElement('span');button.append(lineIcon(doc,id),label);button.addEventListener('click',()=>onNavigate(id));navigation.append(button);links.push([id,label]);}header.append(navigation);
 const search=doc.createElement('form');search.className='command-search';search.setAttribute('role','search');const label=doc.createElement('label');label.htmlFor='mission-search';label.className='sr-only';const input=doc.createElement('input');input.id='mission-search';input.type='search';input.autocomplete='off';const results=doc.createElement('div');results.className='search-results';results.hidden=true;search.append(label,lineIcon(doc,'search'),input,results);header.append(search);
 let entries=[],labels=visualLabels('zh-TW');
 const choose=id=>{input.value='';results.hidden=true;onProjectChoose(id);};
 const updateSearch=()=>{results.replaceChildren();if(!input.value.trim()){results.hidden=true;return;}results.hidden=false;const matches=entries.filter(m=>(m.product.name+' '+m.project_id).toLowerCase().includes(input.value.trim().toLowerCase()));for(const m of matches){const b=doc.createElement('button');b.type='button';b.className='mc-button button-glass';b.textContent=m.product.name;b.addEventListener('click',()=>choose(m.project_id));results.append(b);}if(!matches.length){const p=doc.createElement('p');p.textContent=labels.noResults;results.append(p);}};
 input.addEventListener('input',updateSearch);input.addEventListener('keydown',event=>{if(event.key==='Escape'){input.value='';results.hidden=true;}});search.addEventListener('submit',event=>{event.preventDefault();const first=results.querySelector('button');if(first)first.click();});doc.addEventListener('pointerdown',event=>{if(!search.contains(event.target))results.hidden=true;});
 // Existing sidebar navigation keeps its original listeners. Only add a uniform SVG family.
 for(const button of doc.querySelectorAll('body>nav>button[data-view]')){const icon=doc.createElement('span');icon.className='sidebar-icon';icon.append(lineIcon(doc,button.dataset.view));button.prepend(icon);}
 return(projects,locale)=>{entries=projects;labels=visualLabels(locale);tagline.textContent=labels.subtitle;doc.querySelector('#utility-title').textContent=labels.utility;input.placeholder=labels.search;label.textContent=labels.search;navigation.setAttribute('aria-label',labels.navigation);for(const [id,label] of links)label.textContent=navLabel(id);for(const button of doc.querySelectorAll('body>nav>button[data-view]'))if(!button.querySelector('.sidebar-icon')){const icon=doc.createElement('span');icon.className='sidebar-icon';icon.append(lineIcon(doc,button.dataset.view));button.prepend(icon);}updateSearch();};
}
export function renderSidebar(projects,{doc,locale,w,onLifecycle,onProjectSelect=()=>{},proposals=[]}){
 const v=visualLabels(locale),box=doc.createElement('div');box.id='cockpit-sidebar';
 const section=title=>{const s=doc.createElement('section');s.className='sidebar-module liquid-glass';const h=doc.createElement('h3');h.textContent=title;s.append(h);box.append(s);return s;};
 const lifecycle=section(v.lifecycle);for(const state of ['IDEA','PLANNING','IN_PROGRESS','PAUSED','COMPLETED','ARCHIVED']){const b=doc.createElement('button');b.type='button';b.className='sidebar-state mc-button';applySemantic(b,state);const title=doc.createElement('span');title.textContent=w[state];const count=doc.createElement('span');count.className='sidebar-count';count.textContent=String(projects.filter(m=>m.product.lifecycle===state).length+(state==='IDEA'?proposals.length:0));b.append(title,count);b.addEventListener('click',()=>onLifecycle(state));lifecycle.append(b);}const missing=doc.createElement('p');missing.className='sidebar-note';missing.textContent=v.unrecorded+' · '+projects.filter(m=>!m.product.lifecycle).length;lifecycle.append(missing);
 if(proposals.length){const note=doc.createElement('p');note.className='sidebar-note';note.textContent=locale==='zh-TW'?'構想含待確認方案；未成為正式專案。':locale==='ko'?'아이디어에 확인 대기 제안 포함. 공식 프로젝트가 아닙니다.':'Ideas include pending proposals, not formal projects.';lifecycle.append(note);}const fleet=section(v.fleet);const note=doc.createElement('p');note.className='sidebar-note';note.textContent=locale==='zh-TW'?'最後已確認階段的 Agent；整理階段不代表所有功能的原作者。':locale==='ko'?'마지막 확인 단계의 Agent. 정리 단계가 모든 기능의 원저자를 뜻하지는 않습니다.':'Agent for the last confirmed stage; reconciliation does not identify every feature author.';fleet.append(note);for(const group of lastAgentGroups(projects)){const row=doc.createElement('div');row.className='fleet-readout';row.dataset.lastAgent=group.agent||'UNRECORDED';applySemantic(row,'UNKNOWN');const label=doc.createElement('button');label.type='button';label.className='fleet-agent button-ghost';label.textContent=(group.agent||(locale==='zh-TW'?'最新階段未記錄 Agent':locale==='ko'?'최신 단계 Agent 기록 없음':'Latest stage Agent unrecorded'))+' · '+group.projects.length;label.addEventListener('click',()=>onProjectSelect(group.projects[0].id));row.append(label);for(const project of group.projects){const button=doc.createElement('button');button.type='button';button.className='fleet-project button-ghost';button.dataset.projectId=project.id;button.textContent=project.name||v.unknown;button.addEventListener('click',()=>onProjectSelect(project.id));row.append(button);}fleet.append(row);}return box;
}

// A common platform frame; existing localized headings and event listeners survive.
export function initModuleShell(doc){
 for(const view of doc.querySelectorAll('main>.view')){
  if(view.id==='joey'||view.querySelector('.module-hero'))continue;
  const heading=view.querySelector('.dashboard-heading')||view.querySelector('h2');
  if(!heading)continue;
  const hero=doc.createElement('section');hero.className='module-hero mission-hero liquid-glass';
  const content=doc.createElement('div');content.className='module-heading';
  view.prepend(hero);content.append(heading);
  const identity=doc.createElement('div');identity.className='hero-identity';
  const caption=doc.createElement('small');caption.className='platform-signature';caption.textContent='NexAeon · Mission Control';
  identity.append(brandEye(doc),caption);hero.append(content,identity);
  view.classList.add('module-shell');
 }
}
