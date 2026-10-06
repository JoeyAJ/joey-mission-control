import {presentCanonicalProject} from './project-state.js';
import {initLiquidInteraction,initVisualChrome,renderSidebar} from './visual-system.js';
import {humanWords} from './joey-view.js';
import {renderJoeyView,renderCommandReadouts} from './joey-view.js';
import {agentDetail} from './agent-detail.js';
import {verifiedDecisionItems} from './control-semantics.js';
import {decisionButton,decisionPanel} from './decision-view.js';
import {primaryProjectLink,createProjectLink} from './project-links.js';
import {noAction,canonicalEvidence} from './control-semantics.js';
import {managementSummary,missingLabel,attentionItems,sourceLines,controlFlags} from './presentation.js';
import {t,initLocale,setLocale,getLocale,applyStaticTranslations,displayValue,statusLabel,phaseLabel,sessionStateLabel,classificationLabel,verificationLabel,dirtyLabel,localizeMessage} from './i18n.js';
const $=selector=>document.querySelector(selector);
const all=selector=>[...document.querySelectorAll(selector)];
const value=claim=>claim?.value??'Unknown';
let inboxItems=[],releaseInfo=null;
let manifests=new Map();
let selectedHumanProject='NEXAEON';
let state=null,selectedProject=null,lastContinue=null,lastInterpretation=null,lastNotice=null,activeFilter,token=sessionStorage.getItem('mc-token')||'';

function text(tag,content,cls){const element=document.createElement(tag);element.textContent=content;if(cls)element.className=cls;return element;}
function list(title,items){const box=document.createElement('section');box.append(text('h4',title));const ul=document.createElement('ul');for(const item of items.length?items:[t('common.none')])ul.append(text('li',typeof item==='string'?item:(item.message||JSON.stringify(item)),'selectable'));box.append(ul);return box;}
function provenance(claim){const source=claim?.source;if(!source)return t('provenance.unavailable',{classification:classificationLabel(claim?.classification)});return`${classificationLabel(claim.classification)} · ${source.sourcePath} · ${source.sourceSection} · ${verificationLabel(source.verificationStatus)} · ${t('provenance.read',{time:source.readAt})}`;}
function claimText(key,claim,project){
  const runtime=project&&manifests.get(project.id)?.runtime;
  const mapped={currentTask:"currentMission",lastAI:"lastAgent",model:"lastModel",lastCompleted:"lastCompletedAction",nextAction:"nextAction",blocker:"blocker"}[key];
  if(runtime&&mapped){const v=key==="lastAI"?runtime.currentAgent||runtime.lastAgent:key==="model"?runtime.currentModel||runtime.lastModel:runtime[mapped];if(v==null)return runtime.fields[mapped]?.status==="Awaiting sync"?t("runtime.awaitingSync"):key==="blocker"&&runtime.fields.blocker?.status==="Active"?t("control.noAction"):t("missing.not_recorded");if(runtime.stateSource==="local_mission_overlay")return String(v);}

  if(value(claim)==='Unknown')return missingLabel(claim);
  if(key==='blocker'&&canonicalEvidence(claim)&&noAction(value(claim)))return t('control.noAction');
  return key==='status'?statusLabel(value(claim)):key==='phase'?phaseLabel(value(claim)):['currentTask','nextAction','blocker','lastCompleted','currentStage'].includes(key)?managementSummary(value(claim)):key==='lastUpdated'?displayTime(value(claim)):displayValue(value(claim));
}
function displayTime(raw){const date=new Date(raw);if(!Number.isFinite(date.getTime()))return displayValue(raw);return new Intl.DateTimeFormat(getLocale(),{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',...(String(raw).includes('T')?{hour:'2-digit',minute:'2-digit'}:{})}).format(date);}
function evidenceRegion(project){
  const details=document.createElement('details');details.className='evidence';details.append(text('summary',t('evidence.title')));
  const dl=document.createElement('dl');
  for(const [label,key] of [...dashboardFields,['field.version','version'],['field.workspace','workspace'],['field.phase','phase']]){const dd=claimCell('dd',project[key],key);dd.firstChild.textContent=displayValue(value(project[key]));dl.append(text('dt',t(label)),dd);}
  for(const [key,claim] of Object.entries(project.where||{})){const dd=claimCell('dd',claim,key);dd.firstChild.textContent=Array.isArray(claim.value)?claim.value.join('\n'):displayValue(value(claim));dl.append(text('dt',key),dd);}
  if(project.projectUrls)details.append(text('p',JSON.stringify(project.projectUrls,null,2),'provenance selectable'));
  details.append(dl,list(t('detail.sourceFingerprints'),fingerprintLines(project.sourceFingerprints)),text('p',project.derivationReason,'provenance'));
  return details;
}
function managementFields(project){const dl=document.createElement('dl');dl.className='management';for(const [label,key] of dashboardFields){const dd=text('dd',claimText(key,project[key],project));dd.dataset.field=key;dl.append(text('dt',t(label)),dd);}return dl;}

function claimCell(tag,claim,key){const cell=document.createElement(tag);cell.append(text('span',claimText(key,claim),'selectable'),text('small',provenance(claim),'provenance selectable'));return cell;}
function show(id){if(!['joey','dashboard','inbox','workspaces','handoffs','project'].includes(id))id='joey';document.body.classList.toggle('joey-cockpit-mode',id==='joey');all('[data-view]').forEach(button=>button.setAttribute('aria-current',button.dataset.view===id?'page':'false'));all('.view').forEach(view=>view.classList.toggle('active',view.id===id));history.replaceState(null,'',`#${id}`);renderRelease();}
// Notices are kept as (key, params) or raw server text so a language switch can re-render them.
function notify(key,params={}){lastNotice={key,params};renderNotice();}
function notifyError(error){lastNotice={raw:error.message};renderNotice();}
function renderNotice(){if(!lastNotice)return;$('#status').textContent=lastNotice.raw!==undefined?localizeMessage(lastNotice.raw):t(lastNotice.key,lastNotice.key==='ws.sessionUpdated'?{...lastNotice.params,state:sessionStateLabel(lastNotice.params.state)}:lastNotice.params);}
async function api(path,options={}){const headers={...(options.headers||{})};if(options.body){headers['content-type']='application/json';headers['x-mission-control-token']=token;}const response=await fetch(path,{...options,headers});if(!response.ok)throw new Error((await response.json()).error||response.statusText);return response.json();}
async function reload(){const [snapshot,list]=await Promise.all([api('/api/state'),api('/api/projects')]);manifests=new Map(list.map(m=>[m.project_id,m]));render(snapshot);}

all('nav button').forEach(button=>button.addEventListener('click',()=>{show(button.dataset.view);if(button.dataset.view==='inbox')reloadInbox().catch(notifyError);}));
const renderVisualChrome=initVisualChrome({doc:document,onNavigate:show,navLabel:id=>t({joey:'nav.joey',dashboard:'nav.dashboard',handoffs:'nav.handoffs',project:'nav.project'}[id]),onProjectChoose:id=>{show('joey');document.getElementById('mission-tab-'+id)?.click();document.getElementById('mission-tab-'+id)?.focus();}});
initLiquidInteraction(document.body);
const tokenInput=$('#write-token');tokenInput.value=token;
$('#save-token').addEventListener('click',()=>{token=tokenInput.value.trim();if(token)sessionStorage.setItem('mc-token',token);else sessionStorage.removeItem('mc-token');notify(token?'token.saved':'token.cleared');});

const dashboardFields=[['field.status','status'],['field.currentStage','currentStage'],['field.currentMission','currentTask'],['field.agent','lastAI'],['field.model','model'],['field.lastCompleted','lastCompleted'],['field.nextAction','nextAction'],['evidence.control','blocker'],['field.lastUpdated','lastUpdated']];
function openDecision(project,item){detail(project);const panel=document.getElementById(item.id);if(panel){panel.tabIndex=-1;panel.focus();panel.scrollIntoView({block:'nearest'});}}
function decisionIndicators(project){const items=verifiedDecisionItems(project);if(items.length)return items.map(item=>decisionButton(project,item,openDecision));return project.management?.decisions?.length?[text('p',t('decision.organizing'),'control-indicator')]:[];}
function card(project){
  const article=text('article','', 'card project-card');article.dataset.projectId=project.id;
  article.append(text('h3',displayValue(value(project.name))),managementFields(project));
  article.append(...decisionIndicators(project));
  const button=text('button',t('card.open'));button.addEventListener('click',()=>detail(project));article.append(button);const external=createProjectLink(primaryProjectLink(project));if(external)article.append(external);article.append(evidenceRegion(project));return article;
}
function tableRow(project){
  const row=document.createElement('tr');
  const name=document.createElement('td'),open=text('button',displayValue(value(project.name)));open.addEventListener('click',()=>detail(project));name.append(open);row.append(name);
  for(const key of ['status','currentTask','lastAI','nextAction','blocker','lastUpdated']){
    const cell=document.createElement('td');const span=text('span',claimText(key,project[key],project),'table-summary');cell.append(span);
    if(key==='status')cell.append(text('small',claimText('phase',project.phase)));
    if(key==='lastAI')cell.append(text('small',claimText('model',project.model,project)));
    if(key==='blocker')cell.append(...decisionIndicators(project));
    row.append(cell);
  }
  return row;
}
// Filters compare canonical status values; only the button labels are localized.
function filterProjects(filter){activeFilter=filter;const items=filter?state.projects.filter(project=>value(project.status)===filter):state.projects;$('#project-grid').replaceChildren(...items.map(card));$('#project-table').replaceChildren(...items.map(tableRow));all('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===(filter||''))));}

function showProjectTab(name){all('[data-project-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.projectTab===name)));all('.project-panel').forEach(panel=>{panel.hidden=panel.id!==`project-${name}`;});}
all('[data-project-tab]').forEach(button=>button.addEventListener('click',()=>showProjectTab(button.dataset.projectTab)));

function fingerprintLines(items){return items.map(item=>`${item.path}: ${item.fingerprint}`);}
function projectHandoffs(project){const seen=new Set();return [state.handoffs?.globalLatest,...(state.handoffs?.history||[]),...Object.values(state.handoffs?.byEntity||{})].filter(handoff=>handoff?.entityId===project.id).filter(handoff=>{const key=handoffKey(handoff);if(seen.has(key))return false;seen.add(key);return true;});}
function deploymentOverview(project){
  const section=document.createElement('section'),entry=primaryProjectLink(project);
  if(!entry)return section;
  section.append(text('h4',t(entry.type==='canonical_production'?'url.production':'url.current')),text('p',entry.deploymentType),text('p',new URL(entry.url).hostname,'selectable'));
  if(entry.status==='active_legacy_named')section.append(text('p',t('url.activeLegacy')),text('p',t('url.canonicalMissing')));
  section.append(createProjectLink(entry));return section;
}
function renderDetailPanels(project){
  $('#project-title').textContent=t('project.title',{name:displayValue(value(project.name))});
  const overview=$('#project-overview');overview.replaceChildren(text('h3',t('tab.overview')),text('h4',t('field.currentStage')),text('p',claimText('currentStage',project.currentStage)));
  const m=manifests.get(project.id);
  if(m)overview.append(agentDetail(m));else overview.append(managementFields(project));
  overview.append(deploymentOverview(project));
  overview.append(...decisionIndicators(project),...verifiedDecisionItems(project).map(item=>decisionPanel(project,item)));
  const cases=p=>p.cases||[];overview.append(list(t('detail.nestedCases'),cases(project).map(item=>`${displayValue(value(item.name))}: ${statusLabel(value(item.status))}`)));
  const context=$('#project-context');context.replaceChildren(text('h3',t('evidence.technical')),evidenceRegion(project),text('p',t('detail.database',{value:displayValue(value(project.where.database))}),'selectable'),list(t('detail.relevantDocs'),Array.isArray(project.where.relevantDocs?.value)?project.where.relevantDocs.value:[]),list(t('detail.sourceFingerprints'),fingerprintLines(project.sourceFingerprints)),list(t('detail.approvalGates'),project.approvalGates),list(t('detail.conflicts'),(project.conflicts||[]).map(conflict=>localizeMessage(conflict.message||conflict.kind||String(conflict)))));
  const observation=project.workspaceObservation||{},session=project.session||{};
  $('#project-workspaces').replaceChildren(text('h3',t('tab.workspaces')),text('p',t('workspace.boundary')),text('p',t('ws.path',{value:observation.path||displayValue(value(project.where.localPath))}),'selectable'),text('p',t('ws.branchCommit',{branch:observation.branch||displayValue(value(project.where.branch)),commit:displayValue(observation.head)}),'selectable'),text('p',t('detail.dirtyUpstream',{dirty:dirtyLabel(observation.dirtyState),upstream:displayValue(observation.upstream),ahead:displayValue(observation.ahead),behind:displayValue(observation.behind)})),text('p',t('detail.session',{workspaceId:session.workspaceId||t('common.none'),ai:displayValue(session.ai),model:displayValue(session.model),task:session.declaredTask||t('detail.noTask')})));
  const handoffPanel=$('#project-handoffs');handoffPanel.replaceChildren(text('h3',t('tab.handoffs')),...projectHandoffs(project).map(handoff=>handoffCard(handoff)));
}
function detail(project){selectedProject=project;lastContinue=null;show('project');renderDetailPanels(project);showProjectTab('overview');$('#continue-button').disabled=false;renderContinue();}

function renderContinue(){
  const box=$('#continue-result');
  if(!lastContinue){box.replaceChildren(...(selectedProject?[text('p',t('continue.notInspected'))]:[]));return;}
  const result=lastContinue;
  box.replaceChildren(text('h4',result.canContinue?t('continue.ready'):t('continue.blocked')));
  const resume=document.createElement('dl');for(const [label,content] of [['field.lastAI',result.lastAI],['field.lastCompleted',result.lastCompleted],['field.currentTask',result.currentTask],['field.blocker',result.blocker],['field.nextAction',result.nextAction],['continue.latestCommit',result.latestCommit],['continue.recommendedWorkspace',result.recommendedWorkspace]])resume.append(text('dt',t(label)),text('dd',displayValue(content),'selectable'));
  box.append(text('h4',t('continue.resumeContext')),resume,list(t('detail.conflicts'),result.conflicts.map(conflict=>localizeMessage(conflict))),list(t('detail.approvalGates'),result.approvalGates),list(t('detail.sourceFingerprints'),fingerprintLines(result.sourceFingerprints)),text('h4',t('continue.handoffContext')),text('p',displayValue(result.handoffContext),'selectable'),text('p',t('continue.freshness',{time:result.freshness.gitObservedAt||t('continue.missing'),state:result.freshness.fingerprintsCurrent?t('continue.current'):t('continue.stale')})));
  // The runnable prompt is a technical payload for Hermes and stays in its original form.
  if(result.canContinue&&result.hermesPrompt && result.hermesPrompt.length)box.append(text('pre',result.hermesPrompt,'selectable'));else box.append(text('p',t('continue.noPrompt')));
}
$('#continue-button').addEventListener('click',async()=>{if(!selectedProject)return;try{const expectedContext={sourceFingerprints:selectedProject.sourceFingerprints,workspaceObservation:selectedProject.workspaceObservation,viewedSession:selectedProject.session||null};lastContinue=await api(`/api/projects/${encodeURIComponent(selectedProject.id)}/continue?expectedContext=${encodeURIComponent(JSON.stringify(expectedContext))}`);renderContinue();}catch(error){notifyError(error);}});

function sessionNext(session){return session.state==='starting'?'running':session.state==='running'?'waiting_for_joey':session.state==='waiting_for_joey'?'running':null;}
function renderWorkspaces(snapshot){const box=$('#workspace-list');box.replaceChildren(...snapshot.projects.map(project=>{const observation=project.workspaceObservation||{},session=project.session||{};const article=text('article','', 'card');article.append(text('h3',displayValue(value(project.name))),text('p',t('ws.path',{value:observation.path||displayValue(value(project.where.localPath))}),'selectable'),text('p',t('ws.repository',{value:displayValue(value(project.where.repository))}),'selectable'),text('p',t('ws.branchCommit',{branch:observation.branch||displayValue(value(project.where.branch)),commit:displayValue(observation.head)}),'selectable'),text('p',t('ws.upstream',{upstream:displayValue(observation.upstream),ahead:displayValue(observation.ahead),behind:displayValue(observation.behind)})),text('p',t('ws.dirtyChecked',{dirty:dirtyLabel(observation.dirtyState),time:displayValue(observation.observedAt)})),text('p',t('ws.session',{workspaceId:session.workspaceId||t('common.none'),ai:displayValue(session.ai),model:displayValue(session.model),task:displayValue(session.declaredTask),boundary:displayValue(session.permissionBoundary),state:sessionStateLabel(session.state)})));const recheck=text('button',t('ws.recheck'));recheck.addEventListener('click',async()=>{try{const fresh=await api(`/api/workspaces/${encodeURIComponent(project.id)}/recheck`,{method:'POST',body:'{}'});await reload();notify('ws.rechecked',{time:fresh.observedAt||t('ws.currentTime')});}catch(error){notifyError(error);}});article.append(recheck);const next=sessionNext(session);if(next){const button=text('button',t('ws.updateSession',{state:sessionStateLabel(next)}));button.addEventListener('click',async()=>{try{await api(`/api/sessions/${session.id}`,{method:'PATCH',body:JSON.stringify({state:next})});await reload();notify('ws.sessionUpdated',{state:next});}catch(error){notifyError(error);}});article.append(button);}if(session.id&&!['stopped','failed'].includes(session.state)){for(const [key,target] of [['workflow.stop','stopped'],['workflow.fail','failed']]){const button=text('button',t(key));button.addEventListener('click',async()=>{button.disabled=true;try{await api(`/api/sessions/${session.id}`,{method:'PATCH',body:JSON.stringify({state:target})});await reload();notify('ws.sessionUpdated',{state:target});}catch(error){notifyError(error);}finally{button.disabled=false;}});article.append(button);}}return article;}));}

function handoffKey(handoff){return[handoff.entityId,handoff.task,handoff.status,handoff.summary||handoff.nextAction||'',handoff.sourcePath||''].join('|');}
// Handoff task, status, summary, source path and fingerprint are canonical evidence and render verbatim.
function handoffCard(handoff){const article=text('article','', 'card');article.append(text('h3',`${handoff.entityId||t('handoff.conflictFallback')} · ${displayValue(handoff.task)}`),text('p',t('handoff.taskStatus',{status:displayValue(handoff.status),time:handoff.timestamp||t('handoff.unknownTime')})));if(handoff.conflict)article.append(list(t('handoff.conflictTitle'),(handoff.conflictReasons||[t('handoff.malformed')]).map(reason=>localizeMessage(reason))));article.append(text('p',handoff.summary||handoff.nextAction||t('handoff.noSummary'),'selectable'),text('p',t('handoff.source',{path:displayValue(handoff.sourcePath),fingerprint:displayValue(handoff.fingerprint)}),'selectable'));return article;}
function renderHandoffs(snapshot){const seen=new Set(),items=[snapshot.handoffs?.globalLatest,...(snapshot.handoffs?.history||[]),...Object.values(snapshot.handoffs?.byEntity||{})].filter(Boolean).filter(handoff=>{if(seen.has(handoffKey(handoff)))return false;seen.add(handoffKey(handoff));return true;});$('#handoff-list').replaceChildren(...items.map(handoffCard));}

function attentionCard(project,item){
  const article=text('article','', 'attention-item');article.dataset.type=item.type;
  article.append(text('h4',displayValue(value(project.name))));
  const fieldLabel={version:'field.version',currentTask:'field.currentMission',lastAI:'field.agent',model:'field.model',lastCompleted:'field.lastCompleted',nextAction:'field.nextAction',blocker:'control.blocker'};
  const issue=item.decision?item.decision.what:item.issue.decisionCandidate?t('decision.organizing'):item.issue.field?t('control.missing',{field:t(fieldLabel[item.issue.field]),reason:missingLabel(item.issue)}):managementSummary(item.issue.value);
  article.append(text('p',issue));
  article.append(text('p',t(item.type==='approval'?'control.reviewApproval':item.type==='decision'?'control.makeDecision':'control.inspect'),'required-action'));
  if(item.decision)article.append(decisionButton(project,item.decision,openDecision));else{const open=text('button',t('card.open'));open.addEventListener('click',()=>{detail(project);if(item.type==='warning')showProjectTab('context');});article.append(open);}
  const evidence=document.createElement('details');evidence.className='evidence';evidence.append(text('summary',t('evidence.title')),text('p',item.issue.value,'selectable'),text('small',provenance(item.issue),'provenance'));article.append(evidence);return article;
}
function renderAttention(snapshot){
  const box=$('#attention');box.replaceChildren(text('h3',t('attention.title')));
  const groups=text('div','', 'attention-groups');
  for(const type of ['blocker','approval','decision','warning']){
    const section=document.createElement('section');section.className='attention-group';section.dataset.category=type;
    const items=snapshot.projects.flatMap(project=>attentionItems(project).filter(item=>item.type===type).map(item=>({project,item})));
    section.append(text('h4',t(type==='decision'?'decision.category':`control.${type}`)+' · '+items.length));
    section.append(...items.slice(0,2).map(({project,item})=>attentionCard(project,item)));
    if(items.length>2){const more=document.createElement('details');more.className='attention-more';more.append(text('summary',t('control.remaining',{count:items.length-2})),...items.slice(2).map(({project,item})=>attentionCard(project,item)));section.append(more);}
    if(!items.length)section.append(text('p',t('control.none')));
    groups.append(section);
  }
  box.append(groups);
}

async function reloadInbox(){inboxItems=await api('/api/inbox');renderInbox();}
function inboxStateLabel(state){return t(`inboxState.${state}`);}
async function inboxAction(button,action){
  button.disabled=true;
  try{await action();await reloadInbox();notify('workflow.updated');}catch(error){notifyError(error);}
  finally{button.disabled=false;}
}
function renderInbox(){
  const filter=$('#inbox-filter').value;
  const items=inboxItems.filter(item=>!filter||item.state===filter).slice().sort((a,b)=>(b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt));
  $('#inbox-list').replaceChildren(...(items.length?items.map(item=>{
    const article=text('article','', 'card');article.dataset.inboxId=item.id;
    article.append(text('p',t('workflow.item',{type:t(`inbox.type.${item.type}`),state:inboxStateLabel(item.state),time:item.updatedAt||item.createdAt})),text('p',item.rawText,'selectable'));
    if(item.confirmedAt)article.append(text('p',t('workflow.confirmed')));
    const actions=text('div','', 'inbox-actions');
    function action(key,run){const button=text('button',t(key));button.type='button';button.addEventListener('click',()=>inboxAction(button,run));actions.append(button);return button;}
    if(item.interpretation)action('workflow.preview',async()=>{lastInterpretation=item.interpretation;renderInterpretation();$('#interpretation').scrollIntoView({block:'nearest'});});
    if(['Needs review','Ready to confirm'].includes(item.state))action('workflow.interpret',async()=>{const result=await api(`/api/inbox/${item.id}/interpret`,{method:'POST',body:'{}'});lastInterpretation=result.interpretation;renderInterpretation();});
    if(item.state==='Ready to confirm'&&item.interpretation&&!item.interpretation.ambiguity&&item.interpretation.affectedEntity&&!item.confirmedAt){
      const input=text('input','');input.id=`decision-${item.id}`;input.autocomplete='off';
      const label=text('label',t('workflow.decision'));label.htmlFor=input.id;actions.append(label,input);
      action('workflow.confirm',async()=>{await api(`/api/inbox/${item.id}/confirm`,{method:'POST',body:JSON.stringify({explicitDecision:input.value})});});
    }
    const transition=state=>api(`/api/inbox/${item.id}`,{method:'PATCH',body:JSON.stringify({state,expectedState:item.state})});
    if(item.state==='Ready to confirm'&&item.confirmedAt)action('workflow.progress',()=>transition('In progress'));
    if(item.state!=='Resolved')action('workflow.resolve',()=>transition('Resolved'));
    else action('workflow.reopen',()=>transition('Needs review'));
    article.append(actions);return article;
  }):[text('p',t('workflow.empty'))]));
}
$('#inbox-filter').addEventListener('change',renderInbox);
$('#reload-inbox').addEventListener('click',()=>reloadInbox().catch(notifyError));
function renderRelease(){if(releaseInfo?.readOnly){all('#inbox-form input, #inbox-form textarea, #inbox-form select, #inbox-form button, #session-form input, #session-form select, #session-form button, #write-token, #save-token, #workspace-list button').forEach(el=>el.disabled=true);}if(releaseInfo){$('#release-info').textContent=t(releaseInfo.joeyAcceptance==='PASSED'?'release.accepted':'release.pending',{version:releaseInfo.version,baseline:releaseInfo.parentBaseline.slice(0,7)});if(releaseInfo.developmentVersion)$('#release-info').textContent=t('runtime.candidate');if(releaseInfo.readOnly)$('#release-info').textContent+=' · '+t('release.snapshot',{time:displayTime(releaseInfo.snapshotGeneratedAt)});if($('#joey').classList.contains('active')&&releaseInfo.developmentVersion)$('#release-info').textContent=t('human.release');$('#parent-baseline').textContent=releaseInfo.parentBaseline;}}

function renderInterpretation(){
  if(!lastInterpretation)return;const interpretation=lastInterpretation;
  $('#interpretation').replaceChildren(text('h3',t('inbox.previewTitle')),text('p',interpretation.ambiguity?t('inbox.ambiguous'):t('inbox.affected',{entity:displayValue(interpretation.affectedEntity)})),text('dl',''),list(t('inbox.proposedAction'),[interpretation.proposedAction]),list(t('inbox.expectedFiles'),interpretation.expectedCanonicalFiles),list(t('inbox.sideEffects'),interpretation.sideEffects.map(effect=>localizeMessage(effect))),text('p',localizeMessage(interpretation.approvalBoundary)));
}

async function mutateProjectState(manifest,command){
 notify('state.saving');
 try{const saved=await api(`/api/projects/${encodeURIComponent(manifest.project_id)}/project-state`,{method:'POST',body:JSON.stringify({...command,actor:'joey',confirmation:manifest.project_id,explicitDecision:'JOEY_APPROVES',expectedRevision:manifest.canonicalState.metadata.revision})});const current=manifests.get(manifest.project_id);manifests.set(manifest.project_id,{...current,canonicalState:saved,product:{...current.product,revision:saved.metadata.revision}});const disclosureClasses=['state-workbench','state-idea-entry','state-ideas','state-decision-entry','state-decision-history','state-next-entry','state-confirmations','state-project-sources','flight-recorder','state-audit'];const openPanels=[...document.querySelectorAll('.human-card')].map(card=>({id:card.id,classes:disclosureClasses.filter(cls=>card.querySelector('.'+cls)?.open)}));renderHuman();for(const panel of openPanels)for(const cls of panel.classes){const node=document.getElementById(panel.id)?.querySelector('.'+cls);if(node)node.open=true;}if(['ADD_IDEA','CONVERT_IDEA'].includes(command.type)){const card=document.getElementById('mission-panel-'+manifest.project_id);for(const cls of ['state-workbench','state-ideas']){const node=card?.querySelector('.'+cls);if(node)node.open=true;}}notify('state.saved');return saved;}
 catch(error){notify('state.failed',{reason:error.message});throw error;}
}
function renderHuman(){if(!state)return;const entries=[...manifests.values()].map(m=>presentCanonicalProject(m,getLocale()));renderVisualChrome(entries,getLocale());$('#cockpit-sidebar')?.remove();document.querySelector('body>nav').append(renderSidebar(entries,{doc:document,locale:getLocale(),w:humanWords(getLocale()),onLifecycle:lifecycle=>{show('joey');const board=document.querySelector('.board-toggle');if(board){board.open=true;board.scrollIntoView({block:'start',behavior:'auto'});const lane=board.querySelector('[data-lifecycle='+lifecycle+']');lane?.scrollIntoView({block:'nearest',inline:'center',behavior:'auto'});}}}));$('#cockpit-command-readouts')?.remove();document.querySelector('header').append(renderCommandReadouts(entries,{health:releaseInfo}));$('#product-evidence').replaceChildren(...entries.map(m=>list(m.product.name,[...m.product.evidence.map(e=>e.reference),...Object.values(m.product.sourceEvidence).filter(Boolean).map(e=>e.sourcePath+' · '+e.sourceSection)])));$('#joey-content').replaceChildren(renderJoeyView(entries,{selectedProjectId:selectedHumanProject,onMutation:mutateProjectState,onSelect:id=>{selectedHumanProject=id;},readOnly:!!releaseInfo?.readOnly,onAgent:id=>{const p=state.projects.find(p=>p.id===id);if(p)detail(p);},onMove:async(m,lifecycle,words)=>{if(['COMPLETED','ARCHIVED'].includes(lifecycle)&&!window.confirm(words.finish))return;try{if(m.canonicalState){await mutateProjectState(m,{type:'SET_LIFECYCLE',lifecycle:lifecycle==='IN_PROGRESS'?'DEVELOPING':lifecycle,completionConfirmed:['COMPLETED','ARCHIVED'].includes(lifecycle)});return;}await api(`/api/projects/${encodeURIComponent(m.project_id)}/owner-decisions`,{method:'POST',body:JSON.stringify({actor:'joey',confirmation:m.project_id,explicitDecision:'JOEY_APPROVES',expectedRevision:m.product.revision,lifecycle})});await reload();notify('human.saved');}catch(e){notifyError(e);}},onProposal:async(m,input)=>{try{await api(`/api/projects/${encodeURIComponent(m.project_id)}/owner-proposals`,{method:'POST',body:JSON.stringify(input)});await reload();notify('human.proposed');}catch(e){notifyError(e);}},onApprove:async(m,proposal,words)=>{if(!window.confirm(words.confirm))return;try{await api(`/api/projects/${encodeURIComponent(m.project_id)}/owner-decisions`,{method:'POST',body:JSON.stringify({actor:'joey',confirmation:m.project_id,explicitDecision:'JOEY_APPROVES',expectedRevision:m.product.revision,proposalId:proposal.id})});await reload();notify('human.saved');}catch(e){notifyError(e);}}}));}

function render(snapshot){state=snapshot;renderHuman();$('#freshness').textContent=t('header.generated',{time:displayTime(snapshot.generatedAt)});filterProjects(activeFilter);renderWorkspaces(snapshot);renderRelease();renderHandoffs(snapshot);renderAttention(snapshot);const select=$('#session-entity'),chosen=select.value;select.replaceChildren(...snapshot.projects.map(project=>{const option=text('option',`${project.id} · ${displayValue(value(project.name))}`);option.value=project.id;return option;}));if(chosen)select.value=chosen;if(selectedProject){selectedProject=snapshot.projects.find(project=>project.id===selectedProject.id)||null;if(selectedProject)renderDetailPanels(selectedProject);}}

// Switching language re-renders the cached snapshot only: no API call, no write, and no canonical value is changed.
function applyLocale(locale){setLocale(locale);$('#locale-select').value=getLocale();applyStaticTranslations(document);if(state)render(state);renderContinue();renderInterpretation();renderInbox();renderRelease();renderNotice();}
$('#locale-select').addEventListener('change',event=>applyLocale(event.target.value));
initLocale();applyLocale(getLocale());

all('[data-filter]').forEach(button=>button.addEventListener('click',()=>filterProjects(button.dataset.filter)));
$('#inbox-form').addEventListener('submit',async event=>{event.preventDefault();try{const item=await api('/api/inbox',{method:'POST',body:JSON.stringify({rawText:$('#rawText').value,type:$('#kind').value})});if(['Needs review','Ready to confirm'].includes(item.state)){const preview=await api(`/api/inbox/${item.id}/interpret`,{method:'POST',body:'{}'});lastInterpretation=preview.interpretation;renderInterpretation();}await reloadInbox();notify('workflow.saved');}catch(error){notifyError(error);}});
$('#session-form').addEventListener('submit',async event=>{event.preventDefault();try{await api('/api/sessions',{method:'POST',body:JSON.stringify({entityId:$('#session-entity').value,ai:$('#session-ai').value,model:$('#session-model').value,workspaceId:$('#session-workspaceId').value,path:$('#session-path').value,declaredTask:$('#session-declaredTask').value,permissionBoundary:$('#session-permissionBoundary').value})});await reload();notify('session.created');}catch(error){notifyError(error);}});

reload().catch(error=>notifyError(error));show(location.hash.slice(1)||'joey');

reloadInbox().catch(notifyError);
api('/api/health').then(info=>{releaseInfo=info;renderRelease();renderHuman();}).catch(notifyError);

$('#refresh-state').addEventListener('click',()=>reload().catch(notifyError));
