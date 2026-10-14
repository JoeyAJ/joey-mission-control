// Control Tower: Joey's daily overview. Shows only what Joey needs to steer projects
// (state, version, responsible Agent, one-line status) and the handoff to the next Agent.
// Technical evidence stays behind the existing advanced views.
import {towerModel,AGENTS,agentKey} from './tower-model.js';
const words={
 'zh-TW':{edit:'編輯',remove:'移除',editTitle:'編輯點子',nameLabel:'名稱',ideaLabel:'內容',saveEdit:'儲存',editSaved:'已儲存。',removeConfirm:'確定要把「{name}」從塔台移除嗎？',reReview:'重新驗收',review:'待驗收',reviewHint:'{agent} 回報這一段做完了，等你驗收。',reviewBtn:'驗收',reviewTitle:'驗收 {project}',reviewIntro:'看看 Agent 做了什麼，再決定通過或要求修改。',reviewDone:'做了什麼',testsPass:'測試：{p}/{n} 項通過',testsNone:'沒有測試結果',reviewNext:'Agent 建議的下一步',openSite:'打開網站',feedback:'修改意見（要求修改時必填）',feedbackPlaceholder:'例如：手機上的按鈕太小，請放大',approve:'通過',requestChanges:'要求修改並交接',feedbackRequired:'請先寫下要修改什麼。',approved:'已記錄為通過。',changesGoal:'依驗收意見修改：{text}',ideaGoHint:'已決定進行。按「交接」把這個點子交給一位 Agent，開始建立專案。',restore:'恢復',shelvedTitle:'先放著的點子',shelvedHint:'這些點子暫時不顯示在航線上，隨時可以恢復。',ideaSheetIntro:'選擇一位 Agent，複製指令貼給它。它會依這個點子建立新專案、需求文件和交接入口。',newIdea:'記下新點子',ideaTitle:'記下新點子',ideaIntro:'用一句話寫下想做的東西。它會成為一張「等你決定」的點子卡，只有你登入後看得到。',ideaPlaceholder:'例如：做一個幫新生找宿舍室友的小工具',ideaSave:'存成點子',ideaSaving:'正在儲存…',ideaSaved:'已存好，點子卡已經放進「等你決定」。',ideaFailed:'沒能儲存：{reason}',ideaSignin:'目前沒有登入：點子會先存在這台裝置上（換裝置看不到）。登入後存的點子會進你的私人空間。',ideaFull:'私人點子最多 12 個，請先把舊的點子正式立項或整理掉。',draft:'點子草稿',eyebrow:'NEXAEON · MISSION CONTROL',title:'塔台',intro:'所有項目的位置、負責的 Agent，以及需要你處理的事。',
  all:'全部',attention:'需要你處理',flying:'項目航線',empty:'這一類目前沒有項目。',
  blocked:'卡住了',stale:'可能已停止',decide:'等你決定',awaiting:'等待接手',running:'開發中',paused:'暫停',idea:'點子',done:'完成',idle:'待命',
  version:'版本',noVersion:'版本未記錄',agent:'負責',lastAgent:'最後由',noAgent:'尚無 Agent',updated:'更新',noUpdate:'未記錄',
  blockedHint:'Agent 回報遇到問題，需要你協助。',staleHint:'超過 5 分鐘沒有新回報。可能已停止，也可能還在忙。',decideHint:'只有點子，要繼續進行嗎？',awaitingHint:'交接指令已複製，等待 {agent} 開工回報。',
  handoff:'交接',history:'交接紀錄',details:'技術細節',continue:'繼續進行',shelve:'先放著',
  sheetTitle:'交接 {project}',sheetIntro:'選擇下一位 Agent，複製指令貼給它。它開工回報後，塔台會自動更新。',pickAgent:'下一位 Agent',goal:'這一階段要做什麼（可不填）',goalPlaceholder:'例如：完成手機版交接面板',
  copy:'複製交接指令',copying:'正在準備最新的交接指令…',copied:'已複製。貼給 {agent}，它開工回報後卡片就會更新。',copyFailed:'這次沒能準備好指令：{reason}',manual:'瀏覽器未自動複製，請全選下方文字後手動複製。',cancelHandoff:'取消等待',close:'關閉',
  noHistory:'還沒有交接紀錄。',now:'剛剛',minutes:'{n} 分鐘前',hours:'{n} 小時前',days:'{n} 天前',current:'進行中',demo:'示範資料 · 用來檢視版面，不是真實進度',
  signin:'登入後才能讀取各項目的即時回報。',advanced:'進階工作台',lang:'語言'},
 en:{edit:'Edit',remove:'Remove',editTitle:'Edit idea',nameLabel:'Name',ideaLabel:'Idea',saveEdit:'Save',editSaved:'Saved.',removeConfirm:'Remove “{name}” from the tower?',reReview:'Review again',review:'Needs review',reviewHint:'{agent} reported this stage as done. Your review is next.',reviewBtn:'Review',reviewTitle:'Review {project}',reviewIntro:'See what the Agent did, then approve or ask for changes.',reviewDone:'What was done',testsPass:'Tests: {p}/{n} passed',testsNone:'No test results',reviewNext:'Agent’s suggested next step',openSite:'Open site',feedback:'Change request (required to ask for changes)',feedbackPlaceholder:'e.g. Buttons are too small on phones, please enlarge them',approve:'Approve',requestChanges:'Ask for changes and hand off',feedbackRequired:'Write what should change first.',approved:'Recorded as approved.',changesGoal:'Apply review feedback: {text}',ideaGoHint:'You chose to go ahead. Tap “Hand off” to give this idea to an Agent and start the project.',restore:'Restore',shelvedTitle:'Shelved ideas',shelvedHint:'These ideas are hidden from the board. Restore one any time.',ideaSheetIntro:'Pick an Agent and paste the instruction to it. It will set up a new project, requirements and a handoff entry from this idea.',newIdea:'Capture a new idea',ideaTitle:'Capture a new idea',ideaIntro:'Write what you want to build in one sentence. It becomes a “Your call” idea card, visible only to you when signed in.',ideaPlaceholder:'e.g. A small tool that matches new students with dorm roommates',ideaSave:'Save as idea',ideaSaving:'Saving…',ideaSaved:'Saved. The idea card is now under “Your call”.',ideaFailed:'Could not save: {reason}',ideaSignin:'Not signed in: the idea is saved on this device only (other devices will not see it). Ideas saved while signed in go to your private space.',ideaFull:'You can keep up to 12 private ideas. Formalize or tidy older ones first.',draft:'Idea draft',eyebrow:'NEXAEON · MISSION CONTROL',title:'Control Tower',intro:'Where every project is, which Agent is on it, and what needs you.',
  all:'All',attention:'Needs you',flying:'Flight board',empty:'Nothing in this group right now.',
  blocked:'Blocked',stale:'May have stopped',decide:'Your call',awaiting:'Awaiting pickup',running:'In development',paused:'Paused',idea:'Idea',done:'Done',idle:'Standing by',
  version:'Version',noVersion:'Version not recorded',agent:'On it',lastAgent:'Last by',noAgent:'No Agent yet',updated:'Updated',noUpdate:'Not recorded',
  blockedHint:'The Agent reported a problem and needs your help.',staleHint:'No report for over 5 minutes. It may have stopped, or it may still be busy.',decideHint:'Just an idea so far. Keep going?',awaitingHint:'Handoff copied. Waiting for {agent} to report its start.',
  handoff:'Hand off',history:'Handoff log',details:'Technical details',continue:'Go ahead',shelve:'Shelve for now',
  sheetTitle:'Hand off {project}',sheetIntro:'Pick the next Agent and paste the instruction to it. The tower updates once it reports its start.',pickAgent:'Next Agent',goal:'Goal for this stage (optional)',goalPlaceholder:'e.g. Finish the mobile handoff sheet',
  copy:'Copy handoff instruction',copying:'Preparing the latest handoff instruction…',copied:'Copied. Paste it into {agent}; the card updates once it reports.',copyFailed:'Could not prepare the instruction: {reason}',manual:'The browser did not copy automatically. Select the text below and copy it.',cancelHandoff:'Stop waiting',close:'Close',
  noHistory:'No handoffs yet.',now:'just now',minutes:'{n} min ago',hours:'{n} h ago',days:'{n} d ago',current:'in progress',demo:'Demo data · for layout review, not real progress',
  signin:'Sign in to read each project’s live reports.',advanced:'Advanced workspace',lang:'Language'},
 ko:{edit:'편집',remove:'삭제',editTitle:'아이디어 편집',nameLabel:'이름',ideaLabel:'내용',saveEdit:'저장',editSaved:'저장했습니다.',removeConfirm:'‘{name}’을(를) 관제탑에서 삭제할까요?',reReview:'다시 검수',review:'검수 대기',reviewHint:'{agent}가 이번 단계를 완료했다고 보고했습니다. 검수가 필요합니다.',reviewBtn:'검수',reviewTitle:'{project} 검수',reviewIntro:'Agent가 한 작업을 확인하고 승인하거나 수정을 요청하세요.',reviewDone:'작업 내용',testsPass:'테스트: {n}개 중 {p}개 통과',testsNone:'테스트 결과 없음',reviewNext:'Agent가 제안한 다음 단계',openSite:'사이트 열기',feedback:'수정 요청 (수정 요청 시 필수)',feedbackPlaceholder:'예: 모바일에서 버튼이 너무 작아요. 크게 해 주세요',approve:'승인',requestChanges:'수정 요청 후 인계',feedbackRequired:'먼저 수정할 내용을 적어 주세요.',approved:'승인으로 기록했습니다.',changesGoal:'검수 의견 반영: {text}',ideaGoHint:'진행하기로 결정했습니다. ‘인계’를 눌러 이 아이디어를 Agent에게 맡기고 프로젝트를 시작하세요.',restore:'복원',shelvedTitle:'보류한 아이디어',shelvedHint:'이 아이디어는 항로에서 숨겨져 있습니다. 언제든 복원할 수 있습니다.',ideaSheetIntro:'Agent를 선택하고 지시를 붙여 넣으세요. 이 아이디어로 새 프로젝트, 요구사항 문서와 인계 입구를 만듭니다.',newIdea:'새 아이디어 기록',ideaTitle:'새 아이디어 기록',ideaIntro:'만들고 싶은 것을 한 문장으로 적으세요. 로그인한 본인만 볼 수 있는 ‘결정 대기’ 아이디어 카드가 됩니다.',ideaPlaceholder:'예: 신입생 기숙사 룸메이트를 찾아 주는 작은 도구',ideaSave:'아이디어로 저장',ideaSaving:'저장 중…',ideaSaved:'저장했습니다. 아이디어 카드가 ‘결정 대기’에 추가되었습니다.',ideaFailed:'저장하지 못했습니다: {reason}',ideaSignin:'로그인하지 않았습니다. 아이디어는 이 기기에만 저장됩니다 (다른 기기에서는 보이지 않음). 로그인 중에 저장한 아이디어는 비공개 공간에 저장됩니다.',ideaFull:'비공개 아이디어는 최대 12개입니다. 오래된 아이디어를 먼저 정식 등록하거나 정리하세요.',draft:'아이디어 초안',eyebrow:'NEXAEON · MISSION CONTROL',title:'관제탑',intro:'모든 프로젝트의 위치, 담당 Agent, 그리고 당신이 처리할 일.',
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
const STATE_ICON={review:'✦',blocked:'!',stale:'?',decide:'◆',awaiting:'⇄',running:'▲',paused:'Ⅱ',idea:'◇',done:'✓',idle:'·'};
const HANDOFF_KEY='mc.tower.handoffs.v1';
export function readHandoffs(storage=globalThis.localStorage){try{const v=JSON.parse(storage?.getItem(HANDOFF_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
export function writeHandoff(projectId,value,storage=globalThis.localStorage){try{const all=readHandoffs(storage);if(value)all[projectId]=value;else delete all[projectId];storage?.setItem(HANDOFF_KEY,JSON.stringify(all));}catch{}}
const REVIEW_KEY='mc.tower.reviews.v1';
export function readReviews(storage=globalThis.localStorage){try{const v=JSON.parse(storage?.getItem(REVIEW_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
export function writeReview(projectId,value,storage=globalThis.localStorage){try{const all=readReviews(storage);all[projectId]=value;storage?.setItem(REVIEW_KEY,JSON.stringify(all));}catch{}}
export function relativeTime(at,w,now=Date.now()){const t=Date.parse(at);if(!Number.isFinite(t))return w.noUpdate;const m=Math.max(0,Math.round((now-t)/60000));if(m<1)return w.now;if(m<60)return fill(w.minutes,{n:m});const h=Math.round(m/60);if(h<48)return fill(w.hours,{n:h});return fill(w.days,{n:Math.round(h/24)});}

// Handoff text: a short plain header for the receiving Agent, then the verified packet.
export function handoffInstruction({project,agent,goal,instruction}){
 const header=['# 交接 / Handoff → '+agent,'專案 Project: '+project,'接手 Agent: '+agent+'（registration 的 agentName 請填 "'+agent+'"）',goal?'本階段目標 Goal: '+goal:'本階段目標 Goal: 依專案入口文件的「下一步」','版本 Version: registration 的 featureTitle 請以這一階段的版本號開頭，格式「v0.4 · 目標」（例如 "v0.4 · '+(goal||'完成下一步')+'"），讓 Mission Control 顯示版本。',''].join('\n');
 return header+'\n'+instruction;
}

// New-project handoff built from an idea card; no private repository is involved yet.
export function ideaInstruction({name,idea}){
 return ['請依下面的點子建立一個新專案，並成為它的第一位開發 Agent。','專案名稱 Name: '+name,'點子 Idea:',idea,'',
  '請做：1) 用一頁 PRD.md 整理目標、使用者、成功標準與第一版範圍；2) 建立私人 GitHub repo 與 README.md；3) 建立 HANDOFF.md，寫明目前狀態、下一步、執行 Agent 與時間；4) 先回報規劃給 Joey 確認，再開始實作。',
  '不要自行部署、建立付費服務或寫入其他專案；需要帳號、金鑰或付費時先停下來詢問 Joey。'].join('\n');
}
export function renderControlTower({doc=document,locale='zh-TW',projects=[],runsByProject={},now=Date.now(),demo=false,signedIn=true,filter='all',onFilter=()=>{},onDecision=null,onDetails=()=>{},onAdvanced=()=>{},onLocale=null,account=null,onIdea=null,onIdeaEdit=null,signedInForIdeas=false,mountHandoff=null,prepareInstruction=null,storage=globalThis.localStorage,onChange=()=>{}}={}){
 const w=towerWords(locale),el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const model=towerModel({projects,runsByProject,handoffs:readHandoffs(storage),reviews:readReviews(storage),now});
 const root=el('section','tower');root.dataset.tower='true';
 // Header
 const head=el('div','tower-head'),brand=el('div','tower-brand'),mark=el('img','tower-mark');mark.src='/nexaeon-logo.png';mark.alt='NexAeon';mark.width=480;mark.height=371;brand.append(mark,el('span','tower-divider'));
 const titles=el('div','tower-titles');titles.append(el('h2','tower-title','Mission Control'),el('p','tower-intro',w.intro));brand.append(titles);head.append(brand);
 const advanced=el('button','tower-ghost',w.advanced);advanced.type='button';advanced.addEventListener('click',onAdvanced);const tools=el('div','tower-tools');
 if(onLocale){const lang=el('select','tower-locale');lang.setAttribute('aria-label',w.lang);for(const [value,label] of [['zh-TW','繁體中文'],['ko','한국어'],['en','English']]){const o=el('option','',label);o.value=value;o.lang=value;o.selected=value===locale;lang.append(o);}lang.addEventListener('change',()=>onLocale(lang.value));tools.append(lang);}
 if(account){const wrap=el('div','tower-account');wrap.append(account);tools.append(wrap);}
 tools.append(advanced);head.append(tools);root.append(head);
 if(demo)root.append(el('p','tower-banner',w.demo));else if(!signedIn)root.append(el('p','tower-banner',w.signin));
 // Radar: one chip per state that has projects; clicking filters the board.
 const radar=el('div','tower-radar');radar.setAttribute('role','group');radar.setAttribute('aria-label',w.title);
 const chip=(key,label,count)=>{const b=el('button','tower-chip');b.type='button';b.dataset.state=key;b.setAttribute('aria-pressed',String(filter===key));b.append(el('span','tower-chip-count',String(count)),el('span','tower-chip-label',label));b.addEventListener('click',()=>onFilter(filter===key?'all':key));return b;};
 radar.append(chip('all',w.all,model.total));for(const s of ['blocked','stale','review','decide','awaiting','running','paused','idle','done'])if(model.counts[s])radar.append(chip(s,w[s],model.counts[s]));root.append(radar);
 const visible=c=>filter==='all'||c.state===filter;
 const section=(title,cards,cls)=>{const s=el('section','tower-section '+cls),h=el('h3','tower-section-title');h.append(el('span','',title),el('small','',String(cards.length)));s.append(h);const grid=el('div','tower-grid');for(const c of cards)grid.append(card(c));if(!cards.length)grid.append(el('p','tower-empty',w.empty));s.append(grid);return s;};
 function card(c){
  const a=el('article','tower-card');a.dataset.state=c.state;a.dataset.project=c.id;a.style.setProperty('--agent-hue',hue(c.agent));
  const top=el('div','tower-card-top'),status=el('span','tower-status');status.append(el('i','tower-status-icon',STATE_ICON[c.state]),el('span','',w[c.state]));top.append(status,el('span','tower-version',c.kind==='draft'?w.draft:c.version?'v'+c.version.replace(/^v/i,''):w.noVersion));a.append(top);
  a.append(el('h4','tower-name',c.name));if(c.kind==='draft')a.dataset.kind='draft';
  const pilot=el('div','tower-pilot');const name=c.agent||c.lastAgent;pilot.append(avatar(name),el('span','tower-pilot-role',c.agent?w.agent:c.lastAgent?w.lastAgent:''),el('strong','tower-pilot-name',name||w.noAgent));a.append(pilot);
  const hint=c.kind==='draft'&&c.decision==='go'&&c.state==='idle'?w.ideaGoHint:{review:fill(w.reviewHint,{agent:c.agent}),blocked:w.blockedHint,stale:w.staleHint,decide:w.decideHint,awaiting:fill(w.awaitingHint,{agent:c.agent})}[c.state];
  const line=c.summary||c.feature;if(line)a.append(el('p','tower-line',line));if(hint)a.append(el('p','tower-hint',hint));
  a.append(el('p','tower-time',w.updated+' · '+relativeTime(c.at||c.updatedAt,w,now)));
  const actions=el('div','tower-actions');
  if(c.state==='decide'&&onDecision){const go=el('button','tower-button tower-primary',w.continue),no=el('button','tower-button',w.shelve);go.type=no.type='button';go.addEventListener('click',()=>onDecision(c.id,'continue'));no.addEventListener('click',()=>onDecision(c.id,'shelve'));actions.append(go,no);}
  else if(c.state==='review'){const r=el('button','tower-button tower-primary',w.reviewBtn);r.type='button';r.addEventListener('click',()=>openReview(c));actions.append(r);}
  else{const h=el('button','tower-button tower-primary',w.handoff);h.type='button';h.addEventListener('click',()=>openSheet(c));actions.append(h);}
  if(c.siteUrl){const site=el('a','tower-button tower-site',w.openSite);site.href=c.siteUrl;site.target='_blank';site.rel='noopener noreferrer';actions.append(site);}
  if(c.kind==='draft'&&onIdeaEdit){const e=el('button','tower-button tower-quiet',w.edit),r=el('button','tower-button tower-quiet',w.remove);e.type=r.type='button';e.addEventListener('click',()=>openIdeaEdit(c));r.addEventListener('click',()=>{if(globalThis.confirm?.(fill(w.removeConfirm,{name:c.name}))!==false)onDecision?.(c.id,'remove');});actions.append(e,r);}
  if(c.reviewed&&['idle','awaiting'].includes(c.state)){const again=el('button','tower-button',w.reReview);again.type='button';again.addEventListener('click',()=>openReview({...c,...c.reviewed}));actions.append(again);}
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
 // Close and refresh once; the dialog 'close' event is not reliable in every browser.
 let afterClose=null;const finish=()=>{const run=afterClose;afterClose=null;if(dialog.open)dialog.close();run?.();};dialog.addEventListener('close',()=>finish());dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
 function openSheet(c,preset={}){
  dialog.replaceChildren();let changed=false,disposeHandoff=null;afterClose=()=>{disposeHandoff?.();if(changed)onChange();};const form=el('form','tower-sheet-body');form.method='dialog';
  form.append(el('h3','tower-sheet-title',fill(w.sheetTitle,{project:c.name})),el('p','tower-sheet-intro',w.sheetIntro));
  const pick=el('fieldset','tower-agents');pick.append(el('legend','',w.pickAgent));let chosen=preset.agent||AGENTS.find(a=>a.id!==agentKey(c.agent||c.lastAgent))?.id||AGENTS[0].id;
  for(const a of AGENTS){const label=el('label','tower-agent-option'),input=el('input');input.type='radio';input.name='agent';input.value=a.id;input.checked=a.id===chosen;input.addEventListener('change',()=>{chosen=a.id;});label.style.setProperty('--agent-hue',hue(a.name));label.append(input,avatar(a.name),el('span','',a.name));pick.append(label);}
  const goalLabel=el('label','tower-goal'),goal=el('textarea');goal.rows=2;goal.placeholder=w.goalPlaceholder;goal.maxLength=300;goal.value=preset.goal||'';goalLabel.append(el('span','',w.goal),goal);
  const status=el('p','tower-sheet-status');status.setAttribute('role','status');const fallback=el('textarea','tower-fallback');fallback.readOnly=true;fallback.hidden=true;
  const copy=el('button','tower-button tower-primary',w.copy);copy.type='button';const close=el('button','tower-button',w.close);close.type='button';close.addEventListener('click',finish);
  copy.addEventListener('click',async()=>{const agent=AGENTS.find(a=>a.id===chosen).name;copy.disabled=true;status.textContent=w.copying;fallback.hidden=true;
   try{const base=c.kind==='draft'?ideaInstruction({name:c.name,idea:c.summary||c.name}):prepareInstruction?await prepareInstruction(c.id):'';const text=handoffInstruction({project:c.name,agent,goal:goal.value.trim(),instruction:base});
    writeHandoff(c.id,{agent:chosen,goal:goal.value.trim(),at:new Date().toISOString()},storage);preset.onCopied?.();
    try{await globalThis.navigator.clipboard.writeText(text);status.textContent=fill(w.copied,{agent});}catch{fallback.value=text;fallback.hidden=false;fallback.select();status.textContent=w.manual;}
    changed=true;
   }catch(e){status.textContent=fill(w.copyFailed,{reason:e?.message||String(e)});}
   finally{copy.disabled=false;}});
  const row=el('div','tower-sheet-actions');
  // Real projects reuse the verified takeover flow (sign-in, fresh source read, copy, fallback).
  if(c.kind==='draft'){form.querySelector('.tower-sheet-intro').textContent=w.ideaSheetIntro;row.append(close,copy);form.append(pick,goalLabel,status,fallback,row);}
  else if(mountHandoff){const host=el('div','tower-handoff-host');const agentLabel=()=>AGENTS.find(a=>a.id===chosen).name;
   const dispose=mountHandoff(host,{projectId:c.id,decorate:text=>handoffInstruction({project:c.name,agent:agentLabel(),goal:goal.value.trim(),instruction:text}),onCopied:outcome=>{if(outcome!=='copied'&&outcome!=='manual')return;writeHandoff(c.id,{agent:chosen,goal:goal.value.trim(),at:new Date().toISOString()},storage);preset.onCopied?.();changed=true;status.textContent=fill(w.copied,{agent:agentLabel()});}});
   disposeHandoff=dispose;row.append(close);form.append(pick,goalLabel,host,status,row);}
  else if(!c.kind||c.kind!=='draft'){row.append(close,copy);form.append(pick,goalLabel,status,fallback,row);}
  dialog.append(form);
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 }
 function openIdea(){
  dialog.replaceChildren();let saved=false;afterClose=()=>{if(saved)onChange();};const form=el('form','tower-sheet-body');form.method='dialog';
  const label=el('label','tower-goal'),input=el('textarea');input.rows=3;input.maxLength=2000;input.placeholder=w.ideaPlaceholder;label.append(el('span','',w.ideaIntro),input);
  const status=el('p','tower-sheet-status');status.setAttribute('role','status');if(!signedInForIdeas)status.textContent=w.ideaSignin;
  const save=el('button','tower-button tower-primary',w.ideaSave);save.type='button';const close=el('button','tower-button',w.close);close.type='button';close.addEventListener('click',finish);
  save.addEventListener('click',async()=>{if(!input.value.trim()){input.focus();return;}save.disabled=true;status.textContent=w.ideaSaving;try{await onIdea(input.value.trim());saved=true;status.textContent=w.ideaSaved;input.value='';}catch(e){status.textContent=e?.message==='IDEA_LIMIT'?w.ideaFull:fill(w.ideaFailed,{reason:e?.message||String(e)});}finally{save.disabled=false;}});
  const row=el('div','tower-sheet-actions');row.append(close,save);form.append(el('h3','tower-sheet-title',w.ideaTitle),label,status,row);dialog.append(form);
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');input.focus();
 }
 function openIdeaEdit(c){
  dialog.replaceChildren();let saved=false;afterClose=()=>{if(saved)onChange();};const form=el('form','tower-sheet-body');form.method='dialog';
  const nameLabel=el('label','tower-goal'),name=el('input');name.value=c.name;name.maxLength=100;nameLabel.append(el('span','',w.nameLabel),name);
  const ideaLabel=el('label','tower-goal'),idea=el('textarea');idea.rows=4;idea.maxLength=2000;idea.value=c.summary||'';ideaLabel.append(el('span','',w.ideaLabel),idea);
  const status=el('p','tower-sheet-status');status.setAttribute('role','status');
  const close=el('button','tower-button',w.close),save=el('button','tower-button tower-primary',w.saveEdit);close.type=save.type='button';close.addEventListener('click',finish);
  save.addEventListener('click',async()=>{if(!name.value.trim()||!idea.value.trim())return;save.disabled=true;try{await onIdeaEdit(c.id,{name:name.value.trim(),idea:idea.value.trim()});saved=true;finish();}catch(e){status.textContent=fill(w.ideaFailed,{reason:e?.message||String(e)});}finally{save.disabled=false;}});
  const row=el('div','tower-sheet-actions');row.append(close,save);form.append(el('h3','tower-sheet-title',w.editTitle),nameLabel,ideaLabel,status,row);dialog.append(form);
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');name.focus();
 }
 function openReview(c){
  dialog.replaceChildren();let changed=false;afterClose=()=>{if(changed)onChange();};const form=el('form','tower-sheet-body');form.method='dialog';
  form.append(el('h3','tower-sheet-title',fill(w.reviewTitle,{project:c.name})),el('p','tower-sheet-intro',w.reviewIntro));
  const done=el('section','tower-review-block');done.append(el('h4','',w.reviewDone));const pilot=el('div','tower-pilot');pilot.append(avatar(c.agent),el('strong','tower-pilot-name',c.agent||w.noAgent));done.append(pilot);if(c.feature)done.append(el('p','tower-line',c.feature));if(c.summary&&c.summary!==c.feature)done.append(el('p','tower-review-text',c.summary));form.append(done);
  const tests=c.result?.tests||[];const t=el('section','tower-review-block');t.append(el('h4','',tests.length?fill(w.testsPass,{p:tests.filter(x=>x.outcome==='PASS').length,n:tests.length}):w.testsNone));if(tests.length){const ul=el('ul','tower-tests');for(const x of tests){const li=el('li','',x.name);li.dataset.outcome=x.outcome;ul.append(li);}t.append(ul);}form.append(t);
  if(c.result?.nextSteps){const n=el('section','tower-review-block');n.append(el('h4','',w.reviewNext),el('p','tower-review-text',c.result.nextSteps));form.append(n);}
  if(c.siteUrl){const site=el('a','tower-button tower-site',w.openSite);site.href=c.siteUrl;site.target='_blank';site.rel='noopener noreferrer';form.append(site);}
  const label=el('label','tower-goal'),note=el('textarea');note.rows=3;note.maxLength=600;note.placeholder=w.feedbackPlaceholder;label.append(el('span','',w.feedback),note);
  const status=el('p','tower-sheet-status');status.setAttribute('role','status');
  const close=el('button','tower-button',w.close),fix=el('button','tower-button',w.requestChanges),ok=el('button','tower-button tower-primary',w.approve);for(const b of [close,fix,ok])b.type='button';close.addEventListener('click',finish);
  ok.addEventListener('click',()=>{writeReview(c.id,{runId:c.runId,decision:'accepted',at:new Date().toISOString()},storage);if(c.reviewed?.decision==='changes')writeHandoff(c.id,null,storage);changed=true;status.textContent=w.approved;finish();});
  fix.addEventListener('click',()=>{const text=note.value.trim();if(!text){status.textContent=w.feedbackRequired;note.focus();return;}afterClose=null;dialog.close();openSheet({...c,state:'idle'},{agent:agentKey(c.agent)||undefined,goal:fill(w.changesGoal,{text}),onCopied:()=>writeReview(c.id,{runId:c.runId,decision:'changes',note:text,at:new Date().toISOString()},storage)});});
  const row=el('div','tower-sheet-actions');row.append(close,fix,ok);form.append(label,status,row);dialog.append(form);
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 }
 if(onIdea){const fab=el('button','tower-fab','+');fab.type='button';fab.setAttribute('aria-label',w.newIdea);fab.title=w.newIdea;fab.addEventListener('click',openIdea);root.append(fab);}
 const attention=model.attention.filter(visible),flying=model.flying.filter(visible);
 if(attention.length)root.append(section(w.attention,attention,'tower-attention'));
 root.append(section(w.flying,flying,'tower-flying'));
 if(model.shelved.length&&onDecision){const box=el('details','tower-shelved');box.append(el('summary','',w.shelvedTitle+' · '+model.shelved.length),el('p','tower-empty',w.shelvedHint));const list=el('ul','tower-shelved-list');for(const c of model.shelved){const li=el('li'),b=el('button','tower-button',w.restore);b.type='button';b.addEventListener('click',()=>onDecision(c.id,'restore'));li.append(el('strong','',c.name),el('span','',c.summary||''),b);list.append(li);}box.append(list);root.append(box);}
 root.towerModel=model;
 return root;
}
