// Control Tower: Joey's daily overview. Shows only what Joey needs to steer projects
// (state, version, responsible Agent, one-line status) and the handoff to the next Agent.
// Technical evidence stays behind the existing advanced views.
import {towerModel,AGENTS,agentKey} from './tower-model.js';
const words={
 'zh-TW':{eyebrow:'NEXAEON · MISSION CONTROL',title:'塔台',intro:'所有項目的位置、負責的 Agent，以及需要你處理的事。',
  all:'全部',attention:'需要你處理',flying:'項目航線',empty:'這一類目前沒有項目。',
  blocked:'卡住了',stale:'可能已停止',decide:'等你決定',awaiting:'等待接手',running:'開發中',paused:'暫停',idea:'點子',done:'完成',idle:'待命',
  version:'版本',noVersion:'版本未記錄',agent:'負責',lastAgent:'最後由',noAgent:'尚無 Agent',updated:'更新',noUpdate:'未記錄',
  blockedHint:'Agent 回報遇到問題，需要你協助。',staleHint:'超過 5 分鐘沒有新回報。可能已停止，也可能還在忙。',decideHint:'只有點子，要繼續進行嗎？',awaitingHint:'交接指令已複製，等待 {agent} 開工回報。',
  handoff:'交接',history:'交接紀錄',details:'技術細節',continue:'繼續進行',shelve:'先放著',
  sheetTitle:'交接 {project}',sheetIntro:'選擇下一位 Agent，複製指令貼給它。它開工回報後，塔台會自動更新。',pickAgent:'下一位 Agent',goal:'這一階段要做什麼（可不填）',goalPlaceholder:'例如：完成手機版交接面板',
  copy:'複製交接指令',copying:'正在準備最新的交接指令…',copied:'已複製。貼給 {agent}，它開工回報後卡片就會更新。',copyFailed:'這次沒能準備好指令：{reason}',manual:'瀏覽器未自動複製，請全選下方文字後手動複製。',cancelHandoff:'取消等待',close:'關閉',
  noHistory:'還沒有交接紀錄。',now:'剛剛',minutes:'{n} 分鐘前',hours:'{n} 小時前',days:'{n} 天前',current:'進行中',demo:'示範資料 · 用來檢視版面，不是真實進度',
  signin:'登入後才能讀取各項目的即時回報。',advanced:'進階工作台',lang:'語言'},
 en:{eyebrow:'NEXAEON · MISSION CONTROL',title:'Control Tower',intro:'Where every project is, which Agent is on it, and what needs you.',
  all:'All',attention:'Needs you',flying:'Flight board',empty:'Nothing in this group right now.',
  blocked:'Blocked',stale:'May have stopped',decide:'Your call',awaiting:'Awaiting pickup',running:'In development',paused:'Paused',idea:'Idea',done:'Done',idle:'Standing by',
  version:'Version',noVersion:'Version not recorded',agent:'On it',lastAgent:'Last by',noAgent:'No Agent yet',updated:'Updated',noUpdate:'Not recorded',
  blockedHint:'The Agent reported a problem and needs your help.',staleHint:'No report for over 5 minutes. It may have stopped, or it may still be busy.',decideHint:'Just an idea so far. Keep going?',awaitingHint:'Handoff copied. Waiting for {agent} to report its start.',
  handoff:'Hand off',history:'Handoff log',details:'Technical details',continue:'Go ahead',shelve:'Shelve for now',
  sheetTitle:'Hand off {project}',sheetIntro:'Pick the next Agent and paste the instruction to it. The tower updates once it reports its start.',pickAgent:'Next Agent',goal:'Goal for this stage (optional)',goalPlaceholder:'e.g. Finish the mobile handoff sheet',
  copy:'Copy handoff instruction',copying:'Preparing the latest handoff instruction…',copied:'Copied. Paste it into {agent}; the card updates once it reports.',copyFailed:'Could not prepare the instruction: {reason}',manual:'The browser did not copy automatically. Select the text below and copy it.',cancelHandoff:'Stop waiting',close:'Close',
  noHistory:'No handoffs yet.',now:'just now',minutes:'{n} min ago',hours:'{n} h ago',days:'{n} d ago',current:'in progress',demo:'Demo data · for layout review, not real progress',
  signin:'Sign in to read each project’s live reports.',advanced:'Advanced workspace',lang:'Language'},
 ko:{eyebrow:'NEXAEON · MISSION CONTROL',title:'관제탑',intro:'모든 프로젝트의 위치, 담당 Agent, 그리고 당신이 처리할 일.',
  all:'전체',attention:'처리 필요',flying:'프로젝트 항로',empty:'이 분류에는 현재 프로젝트가 없습니다.',
  blocked:'막힘',stale:'중단 가능성',decide:'결정 대기',awaiting:'인계 대기',running:'개발 중',paused:'일시 중지',idea:'아이디어',done:'완료',idle:'대기',
  version:'버전',noVersion:'버전 기록 없음',agent:'담당',lastAgent:'마지막 담당',noAgent:'Agent 없음',updated:'갱신',noUpdate:'기록 없음',
  blockedHint:'Agent가 문제를 보고했습니다. 도움이 필요합니다.',staleHint:'5분 넘게 새 보고가 없습니다. 멈췄거나 아직 작업 중일 수 있습니다.',decideHint:'아직 아이디어 단계입니다. 계속 진행할까요?',awaitingHint:'인계 지시를 복사했습니다. {agent}의 시작 보고를 기다리는 중입니다.',
  handoff:'인계',history:'인계 기록',details:'기술 세부 정보',continue:'진행하기',shelve:'보류하기',
  sheetTitle:'{project} 인계',sheetIntro:'다음 Agent를 선택하고 지시를 붙여 넣으세요. 시작 보고가 오면 관제탑이 자동으로 갱신됩니다.',pickAgent:'다음 Agent',goal:'이번 단계 목표 (선택)',goalPlaceholder:'예: 모바일 인계 패널 완성',
  copy:'인계 지시 복사',copying:'최신 인계 지시를 준비하는 중…',copied:'복사 완료. {agent}에 붙여 넣으면 시작 보고 후 카드가 갱신됩니다.',copyFailed:'지시를 준비하지 못했습니다: {reason}',manual:'자동 복사가 되지 않았습니다. 아래 텍스트를 전체 선택해 복사하세요.',cancelHandoff:'대기 취소',close:'닫기',
  noHistory:'아직 인계 기록이 없습니다.',now:'방금',minutes:'{n}분 전',hours:'{n}시간 전',days:'{n}일 전',current:'진행 중',demo:'예시 데이터 · 화면 확인용이며 실제 진행이 아닙니다',
  signin:'로그인하면 각 프로젝트의 실시간 보고를 읽을 수 있습니다.',advanced:'고급 작업 공간',lang:'언어'}
};
export const towerWords=locale=>words[locale]||words['zh-TW'];
const fill=(text,values)=>text.replace(/\{(\w+)\}/g,(_,k)=>values[k]??'');
const STATE_ICON={blocked:'!',stale:'?',decide:'◆',awaiting:'⇄',running:'▲',paused:'Ⅱ',idea:'◇',done:'✓',idle:'·'};
const HANDOFF_KEY='mc.tower.handoffs.v1';
export function readHandoffs(storage=globalThis.localStorage){try{const v=JSON.parse(storage?.getItem(HANDOFF_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
export function writeHandoff(projectId,value,storage=globalThis.localStorage){try{const all=readHandoffs(storage);if(value)all[projectId]=value;else delete all[projectId];storage?.setItem(HANDOFF_KEY,JSON.stringify(all));}catch{}}
export function relativeTime(at,w,now=Date.now()){const t=Date.parse(at);if(!Number.isFinite(t))return w.noUpdate;const m=Math.max(0,Math.round((now-t)/60000));if(m<1)return w.now;if(m<60)return fill(w.minutes,{n:m});const h=Math.round(m/60);if(h<48)return fill(w.hours,{n:h});return fill(w.days,{n:Math.round(h/24)});}

// Handoff text: a short plain header for the receiving Agent, then the verified packet.
export function handoffInstruction({project,agent,goal,instruction}){
 const header=['# 交接 / Handoff → '+agent,'專案 Project: '+project,'接手 Agent: '+agent+'（registration 的 agentName 請填 "'+agent+'"）',goal?'本階段目標 Goal: '+goal:'本階段目標 Goal: 依專案入口文件的「下一步」','版本 Version: registration 的 featureTitle 請以這一階段的版本號開頭，格式「v0.4 · 目標」（例如 "v0.4 · '+(goal||'完成下一步')+'"），讓 Mission Control 顯示版本。',''].join('\n');
 return header+'\n'+instruction;
}

export function renderControlTower({doc=document,locale='zh-TW',projects=[],runsByProject={},now=Date.now(),demo=false,signedIn=true,filter='all',onFilter=()=>{},onDecision=null,onDetails=()=>{},onAdvanced=()=>{},onLocale=null,account=null,mountHandoff=null,prepareInstruction=null,storage=globalThis.localStorage,onChange=()=>{}}={}){
 const w=towerWords(locale),el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const model=towerModel({projects,runsByProject,handoffs:readHandoffs(storage),now});
 const root=el('section','tower');root.dataset.tower='true';
 // Header
 const head=el('div','tower-head'),brand=el('div','tower-brand'),mark=el('img','tower-mark');mark.src='/brand-eye-source.png';mark.alt='';brand.append(mark);
 const titles=el('div','tower-titles');titles.append(el('p','tower-eyebrow',w.eyebrow),el('h2','tower-title',w.title),el('p','tower-intro',w.intro));brand.append(titles);head.append(brand);
 const advanced=el('button','tower-ghost',w.advanced);advanced.type='button';advanced.addEventListener('click',onAdvanced);const tools=el('div','tower-tools');
 if(onLocale){const lang=el('select','tower-locale');lang.setAttribute('aria-label',w.lang);for(const [value,label] of [['zh-TW','繁體中文'],['ko','한국어'],['en','English']]){const o=el('option','',label);o.value=value;o.lang=value;o.selected=value===locale;lang.append(o);}lang.addEventListener('change',()=>onLocale(lang.value));tools.append(lang);}
 if(account){const wrap=el('div','tower-account');wrap.append(account);tools.append(wrap);}
 tools.append(advanced);head.append(tools);root.append(head);
 if(demo)root.append(el('p','tower-banner',w.demo));else if(!signedIn)root.append(el('p','tower-banner',w.signin));
 // Radar: one chip per state that has projects; clicking filters the board.
 const radar=el('div','tower-radar');radar.setAttribute('role','group');radar.setAttribute('aria-label',w.title);
 const chip=(key,label,count)=>{const b=el('button','tower-chip');b.type='button';b.dataset.state=key;b.setAttribute('aria-pressed',String(filter===key));b.append(el('span','tower-chip-count',String(count)),el('span','tower-chip-label',label));b.addEventListener('click',()=>onFilter(filter===key?'all':key));return b;};
 radar.append(chip('all',w.all,model.total));for(const s of ['blocked','stale','decide','awaiting','running','paused','idle','done'])if(model.counts[s])radar.append(chip(s,w[s],model.counts[s]));root.append(radar);
 const visible=c=>filter==='all'||c.state===filter;
 const section=(title,cards,cls)=>{const s=el('section','tower-section '+cls),h=el('h3','tower-section-title');h.append(el('span','',title),el('small','',String(cards.length)));s.append(h);const grid=el('div','tower-grid');for(const c of cards)grid.append(card(c));if(!cards.length)grid.append(el('p','tower-empty',w.empty));s.append(grid);return s;};
 function card(c){
  const a=el('article','tower-card');a.dataset.state=c.state;a.dataset.project=c.id;a.style.setProperty('--agent-hue',hue(c.agent));
  const top=el('div','tower-card-top'),status=el('span','tower-status');status.append(el('i','tower-status-icon',STATE_ICON[c.state]),el('span','',w[c.state]));top.append(status,el('span','tower-version',c.version?'v'+c.version.replace(/^v/i,''):w.noVersion));a.append(top);
  a.append(el('h4','tower-name',c.name));
  const pilot=el('div','tower-pilot');const name=c.agent||c.lastAgent;pilot.append(avatar(name),el('span','tower-pilot-role',c.agent?w.agent:c.lastAgent?w.lastAgent:''),el('strong','tower-pilot-name',name||w.noAgent));a.append(pilot);
  const hint={blocked:w.blockedHint,stale:w.staleHint,decide:w.decideHint,awaiting:fill(w.awaitingHint,{agent:c.agent})}[c.state];
  const line=c.summary||c.feature;if(line)a.append(el('p','tower-line',line));if(hint)a.append(el('p','tower-hint',hint));
  a.append(el('p','tower-time',w.updated+' · '+relativeTime(c.at||c.updatedAt,w,now)));
  const actions=el('div','tower-actions');
  if(c.state==='decide'&&onDecision){const go=el('button','tower-button tower-primary',w.continue),no=el('button','tower-button',w.shelve);go.type=no.type='button';go.addEventListener('click',()=>onDecision(c.id,'continue'));no.addEventListener('click',()=>onDecision(c.id,'shelve'));actions.append(go,no);}
  else{const h=el('button','tower-button tower-primary',w.handoff);h.type='button';h.addEventListener('click',()=>openSheet(c));actions.append(h);}
  if(c.state==='awaiting'){const x=el('button','tower-button',w.cancelHandoff);x.type='button';x.addEventListener('click',()=>{writeHandoff(c.id,null,storage);onChange();});actions.append(x);}
  a.append(actions);
  const log=el('details','tower-log');log.append(el('summary','',w.history));const ol=el('ol','tower-timeline');if(!c.history.length)log.append(el('p','tower-empty',w.noHistory));for(const h of c.history.slice(0,8)){const li=el('li');li.style.setProperty('--agent-hue',hue(h.agent));li.append(el('strong','',h.agent),el('span','',h.feature),el('small','',(['running','blocked'].includes(h.state)?w.current+' · ':'')+relativeTime(h.at,w,now)));ol.append(li);}log.append(ol);
  const more=el('button','tower-link',w.details);more.type='button';more.addEventListener('click',()=>onDetails(c.id));log.append(more);a.append(log);
  return a;
 }
 function avatar(name){const k=agentKey(name),s=el('span','tower-avatar');s.dataset.agent=k||'none';s.textContent=name?name.trim()[0].toUpperCase():'–';s.setAttribute('aria-hidden','true');return s;}
 function hue(name){return {codex:'200',claude:'24',hermes:'280',other:'250'}[agentKey(name)]||'262';}
 // Handoff sheet: dialog on desktop, bottom sheet on phones (CSS).
 const dialog=el('dialog','tower-sheet');root.append(dialog);
 function openSheet(c){
  dialog.replaceChildren();let changed=false;dialog.onclose=()=>{if(changed)onChange();};const form=el('form','tower-sheet-body');form.method='dialog';
  form.append(el('h3','tower-sheet-title',fill(w.sheetTitle,{project:c.name})),el('p','tower-sheet-intro',w.sheetIntro));
  const pick=el('fieldset','tower-agents');pick.append(el('legend','',w.pickAgent));let chosen=AGENTS.find(a=>a.id!==agentKey(c.agent||c.lastAgent))?.id||AGENTS[0].id;
  for(const a of AGENTS){const label=el('label','tower-agent-option'),input=el('input');input.type='radio';input.name='agent';input.value=a.id;input.checked=a.id===chosen;input.addEventListener('change',()=>{chosen=a.id;});label.style.setProperty('--agent-hue',hue(a.name));label.append(input,avatar(a.name),el('span','',a.name));pick.append(label);}
  const goalLabel=el('label','tower-goal'),goal=el('textarea');goal.rows=2;goal.placeholder=w.goalPlaceholder;goal.maxLength=300;goalLabel.append(el('span','',w.goal),goal);
  const status=el('p','tower-sheet-status');status.setAttribute('role','status');const fallback=el('textarea','tower-fallback');fallback.readOnly=true;fallback.hidden=true;
  const copy=el('button','tower-button tower-primary',w.copy);copy.type='button';const close=el('button','tower-button',w.close);close.type='submit';
  copy.addEventListener('click',async()=>{const agent=AGENTS.find(a=>a.id===chosen).name;copy.disabled=true;status.textContent=w.copying;fallback.hidden=true;
   try{const base=prepareInstruction?await prepareInstruction(c.id):'';const text=handoffInstruction({project:c.name,agent,goal:goal.value.trim(),instruction:base});
    writeHandoff(c.id,{agent:chosen,goal:goal.value.trim(),at:new Date().toISOString()},storage);
    try{await globalThis.navigator.clipboard.writeText(text);status.textContent=fill(w.copied,{agent});}catch{fallback.value=text;fallback.hidden=false;fallback.select();status.textContent=w.manual;}
    changed=true;
   }catch(e){status.textContent=fill(w.copyFailed,{reason:e?.message||String(e)});}
   finally{copy.disabled=false;}});
  const row=el('div','tower-sheet-actions');
  // Real projects reuse the verified takeover flow (sign-in, fresh source read, copy, fallback).
  if(mountHandoff){const host=el('div','tower-handoff-host');const agentLabel=()=>AGENTS.find(a=>a.id===chosen).name;
   const dispose=mountHandoff(host,{projectId:c.id,decorate:text=>handoffInstruction({project:c.name,agent:agentLabel(),goal:goal.value.trim(),instruction:text}),onCopied:outcome=>{if(outcome!=='copied'&&outcome!=='manual')return;writeHandoff(c.id,{agent:chosen,goal:goal.value.trim(),at:new Date().toISOString()},storage);changed=true;status.textContent=fill(w.copied,{agent:agentLabel()});}});
   dialog.addEventListener('close',()=>dispose?.(),{once:true});row.append(close);form.append(pick,goalLabel,host,status,row);}
  else{row.append(close,copy);form.append(pick,goalLabel,status,fallback,row);}
  dialog.append(form);
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 }
 const attention=model.attention.filter(visible),flying=model.flying.filter(visible);
 if(attention.length)root.append(section(w.attention,attention,'tower-attention'));
 root.append(section(w.flying,flying,'tower-flying'));
 root.towerModel=model;
 return root;
}
