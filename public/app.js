import {createOwnerProjectConnectionClient,mountOwnerBrowserEntry,readOwnerTowerRuns,listOwnerIdeaDrafts,saveOwnerIdea,updateOwnerIdea,readOwnerTowerState,patchOwnerTowerState,readOwnerRegisteredProjects} from './owner-auth-client.js';
import {createTowerStore} from './tower-sync.js';
import {createTowerRefresh} from './tower-refresh.js';
import {mountJoeyTakeover} from './joey-takeover.js';
import {ownerAuthSetupStatus,ownerAuthConfig} from './owner-auth-config.js';
import {taskWorkflowConfig} from './task-workflow-config.js';
import {renderCommandWorkspace,workspaceWords,workspaceHash,readWorkspacePanel,readWorkspaceInspector,readWorkspaceFilter} from './command-workspace.js';
import {replaceCommandWorkspace,rememberCommandWorkspace} from './workspace-reading.js';
import {renderPublicCases} from './public-cases.js';
import {readContext,contextHash,renderAssetCatalog,contextWords,renderLinkageStatus} from './proposal-navigation.js';
import {renderProposals} from './proposals.js';
import {retainLastConfirmed} from './joey-operations.js';
import {presentCanonicalProject} from './project-state.js';
import {initLiquidInteraction,initVisualChrome,initModuleShell,renderSidebar} from './visual-system.js';
import {humanWords} from './joey-view.js';
import {renderJoeyView,renderCommandReadouts} from './joey-view.js';
import {agentDetail} from './agent-detail.js';
import {verifiedDecisionItems} from './control-semantics.js';
import {decisionButton,decisionPanel} from './decision-view.js';
import {primaryProjectLink,createProjectLink} from './project-links.js';
import {noAction,canonicalEvidence} from './control-semantics.js';
import {managementSummary,missingLabel,attentionItems,sourceLines,controlFlags} from './presentation.js';
import {renderControlTower,towerWords} from './control-tower.js';
import {demoTower,demoHandoffs} from './tower-demo.js';
import {t,initLocale,setLocale,getLocale,applyStaticTranslations,displayValue,statusLabel,phaseLabel,sessionStateLabel,classificationLabel,verificationLabel,dirtyLabel,localizeMessage} from './i18n.js';
const $=selector=>document.querySelector(selector);
const all=selector=>[...document.querySelectorAll(selector)];
const value=claim=>claim?.value??'Unknown';
let observationExpiryTimer=null,simpleJoeyView=null,workspaceRunSelection=null;
let inboxItems=[],releaseInfo=null,pendingProposals=[],publicCaseSnapshot=null,observerView=null,stageChangeView=null,taskObservationView=null;
let manifests=new Map();
const authorizedProjectClient=createOwnerProjectConnectionClient(),privateRouteOptions={isAuthorizedProject:id=>authorizedProjectClient.snapshot().some(p=>p.projectId===id&&p.selectable)};
let viewContext=readContext(location.hash,privateRouteOptions),selectedHumanProject=viewContext.project,assetCatalog=null,lastWorkspaceRoute=null;
let lastSuccessfulRead=null,readFailed=false,externalDataChange=false,readingData=false;
const localDataChannel=typeof BroadcastChannel!=='undefined'&&['127.0.0.1','localhost','[::1]'].includes(location.hostname)?new BroadcastChannel('joey-mission-control-local-data'):null;
localDataChannel?.addEventListener('message',event=>{if(event.data?.type==='local-data-changed'&&releaseInfo?.candidateStage==='V0.3-E'&&!releaseInfo.readOnly){externalDataChange=true;renderDataStatus();}});
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
  return key==='status'?(releaseInfo?.readOnly?workspaceWords(getLocale()).recorded+' · ':'')+statusLabel(value(claim)):key==='phase'?phaseLabel(value(claim)):['currentTask','nextAction','blocker','lastCompleted','currentStage'].includes(key)?managementSummary(value(claim)):key==='lastUpdated'?displayTime(value(claim)):displayValue(value(claim));
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
function show(id){if(id!=='workspace')id='joey';if(id!=='joey'||!isTowerRoute())document.body.classList.remove('tower-mode');if(id!=='workspace'){workspaceRunSelection?.cancel();workspaceRunSelection=null;}if(id!=='workspace'&&$('#workspace').classList.contains('active')){rememberCommandWorkspace($('#workspace-content'));$('#workspace-content').querySelector('#command-workspace')?.disposeWorkbench?.();}if(id!=='joey'&&simpleJoeyView){simpleJoeyView.dispose();simpleJoeyView=null;}document.body.dataset.joeySimple=String(id==='joey'&&isSimpleJoeyRoute());if(!['workspace','joey','dashboard','inbox','workspaces','handoffs','project'].includes(id))id='joey';document.body.classList.add('joey-cockpit-mode');document.body.dataset.activeModule=id;const advancedNav=$('#advanced-navigation');if(advancedNav)advancedNav.open=id!=='joey'||!isSimpleJoeyRoute();all('[data-view]').forEach(button=>button.setAttribute('aria-current',button.dataset.view===id?'page':'false'));all('.view').forEach(view=>view.classList.toggle('active',view.id===id));if(!((id==='joey'&&location.hash.startsWith('#joey?'))||(id==='workspace'&&location.hash.startsWith('#workspace?'))||(id==='project'&&location.hash.startsWith('#project?'))))history.replaceState(null,'',`#${id}`);renderRelease();}
// Notices are kept as (key, params) or raw server text so a language switch can re-render them.
function notify(key,params={}){lastNotice={key,params};renderNotice();}
function notifyError(error){lastNotice={raw:error.message};renderNotice();}
function renderNotice(){if(!lastNotice)return;$('#status').textContent=lastNotice.raw!==undefined?localizeMessage(lastNotice.raw):t(lastNotice.key,lastNotice.key==='ws.sessionUpdated'?{...lastNotice.params,state:sessionStateLabel(lastNotice.params.state)}:lastNotice.params);}
function renderDataStatus(){document.querySelector('#command-workspace')?.renderRefreshState?.(readingData,readFailed);const commandRefresh=document.querySelector('[data-command-refresh]');if(commandRefresh){commandRefresh.disabled=readingData;commandRefresh.textContent=workspaceWords(getLocale())[readingData?'reading':'refresh'];}const node=renderLinkageStatus({locale:getLocale(),readOnly:releaseInfo?!!releaseInfo.readOnly:null,sourceAsOf:releaseInfo?.snapshotGeneratedAt,lastReadAt:lastSuccessfulRead,failed:readFailed,externalChange:externalDataChange,reading:readingData,onRefresh:()=>reload().catch(notifyError)});const old=$('#data-link-status');if(old)old.replaceWith(node);else document.querySelector('body>header').append(node);}
async function api(path,options={}){const headers={...(options.headers||{})};if(options.body){headers['content-type']='application/json';headers['x-mission-control-token']=token;}const response=await fetch(path,{...options,headers});if(!response.ok)throw new Error((await response.json()).error||response.statusText);const result=await response.json();if(['POST','PATCH'].includes(options.method)&&releaseInfo?.candidateStage==='V0.3-E'&&!releaseInfo.readOnly)localDataChannel?.postMessage({type:'local-data-changed'});return result;}
function scheduleObservationExpiry(){clearTimeout(observationExpiryTimer);observationExpiryTimer=null;const delay=Date.parse(taskObservationView?.expiresAt)-Date.now();if(taskObservationView?.validity==='RECENT'&&Number.isFinite(delay)&&delay>0)observationExpiryTimer=setTimeout(refreshActiveView,Math.min(delay+1,300001));}
function refreshActiveView(){if(!state)return;if($('#workspace').classList.contains('active'))renderWorkspace();else if($('#joey').classList.contains('active'))renderHuman();}
window.addEventListener('focus',refreshActiveView);
async function reload(){readingData=true;renderDataStatus();try{if(!releaseInfo){releaseInfo=await api('/api/health');renderRelease();}const [snapshot,list]=await Promise.all([api('/api/state'),api('/api/projects')]);let nextTaskObservation=taskObservationView,nextStageChange=stageChangeView,nextObserver=observerView,nextProposals=pendingProposals,nextCatalog=assetCatalog,nextInbox=inboxItems,nextPublicCases=publicCaseSnapshot;const activeInbox=$('#inbox').classList.contains('active');if(releaseInfo?.candidateStage==='V0.3-E'&&!releaseInfo.readOnly){[nextProposals,nextCatalog]=await Promise.all([api('/api/proposals'),api('/api/asset-catalog')]);}if(releaseInfo?.taskObservation)nextTaskObservation=await api('/api/task-observation');if(releaseInfo?.stageChanges)nextStageChange=await api('/api/stage-changes');if(releaseInfo?.candidateObserver)nextObserver=await api('/api/observer');if(releaseInfo?.readOnly)nextPublicCases=await api('/api/public-cases');if(activeInbox&&!releaseInfo?.readOnly)nextInbox=await api('/api/inbox');manifests=new Map(list.map(m=>[m.project_id,m]));pendingProposals=nextProposals;assetCatalog=nextCatalog;inboxItems=nextInbox;publicCaseSnapshot=nextPublicCases;observerView=nextObserver;stageChangeView=nextStageChange;taskObservationView=nextTaskObservation;scheduleObservationExpiry();lastSuccessfulRead=new Date().toISOString();readFailed=false;externalDataChange=false;render(snapshot);if(activeInbox)renderInbox();}catch(error){readFailed=true;manifests=retainLastConfirmed(manifests,new Date().toISOString());if(state)renderHuman();throw error;}finally{readingData=false;renderDataStatus();}}


all('nav button').forEach(button=>button.addEventListener('click',()=>{navigateView(button.dataset.view);if(button.dataset.view==='inbox')reloadInbox().catch(notifyError);}));
const renderVisualChrome=initVisualChrome({doc:document,onNavigate:navigateView,navLabel:id=>t({workspace:'nav.workspace',joey:'nav.joey',dashboard:'nav.dashboard',handoffs:'nav.handoffs',project:'nav.project'}[id]),onProjectChoose:id=>{show('joey');document.getElementById('mission-tab-'+id)?.click();document.getElementById('mission-tab-'+id)?.focus();}});
initModuleShell(document);
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
function requiresPrivateProjectSource(project){return taskWorkflowConfig.projectSourceSyncEnabled===true&&['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'].includes(project?.id);}
function hasPrivateProjectSourceEntry(){return ownerAuthSetupStatus().ownerIdentityEntryAvailable===true;}
function detail(project,{restore=false}={}){if(project?.id){location.hash='#joey?'+new URLSearchParams({detail:project.id});return;}if(requiresPrivateProjectSource(project)&&hasPrivateProjectSourceEntry()){lastContinue=null;$('#continue-result').replaceChildren();selectedProject=null;navigateWorkspace({project:project.id,panel:'events',track:readSourceTrack(location.hash,project.id)},{push:!restore});return;}if(!restore&&location.hash!==`#project?project=${encodeURIComponent(project.id)}`)history.pushState(null,'',`#project?project=${encodeURIComponent(project.id)}`);selectedProject=project;lastContinue=null;show('project');renderDetailPanels(project);showProjectTab('overview');$('#continue-button').disabled=requiresPrivateProjectSource(project);renderContinue();}

function renderContinue(){
  const box=$('#continue-result');
  if(requiresPrivateProjectSource(selectedProject)&&!hasPrivateProjectSourceEntry()){box.replaceChildren(text('p',workspaceWords(getLocale()).continueUnavailable,'source-qualification'));box.dataset.continueAvailability='historical-readonly';return;}delete box.dataset.continueAvailability;
  if(!lastContinue){box.replaceChildren(...(selectedProject?[text('p',t('continue.notInspected'))]:[]));return;}
  const result=lastContinue;
  box.replaceChildren(text('h4',result.canContinue?t('continue.ready'):t('continue.blocked')));
  const resume=document.createElement('dl');for(const [label,content] of [['field.lastAI',result.lastAI],['field.lastCompleted',result.lastCompleted],['field.currentTask',result.currentTask],['field.blocker',result.blocker],['field.nextAction',result.nextAction],['continue.latestCommit',result.latestCommit],['continue.recommendedWorkspace',result.recommendedWorkspace]])resume.append(text('dt',t(label)),text('dd',displayValue(content),'selectable'));
  box.append(text('h4',t('continue.resumeContext')),resume,list(t('detail.conflicts'),result.conflicts.map(conflict=>localizeMessage(conflict))),list(t('detail.approvalGates'),result.approvalGates),list(t('detail.sourceFingerprints'),fingerprintLines(result.sourceFingerprints)),text('h4',t('continue.handoffContext')),text('p',displayValue(result.handoffContext),'selectable'),text('p',t('continue.freshness',{time:result.freshness.gitObservedAt||t('continue.missing'),state:result.freshness.fingerprintsCurrent?t('continue.current'):t('continue.stale')})));
  // The runnable prompt is a technical payload for Hermes and stays in its original form.
  if(result.canContinue&&result.hermesPrompt && result.hermesPrompt.length)box.append(text('pre',result.hermesPrompt,'selectable'));else box.append(text('p',t('continue.noPrompt')));
}
$('#continue-button').addEventListener('click',async()=>{if(!selectedProject)return;if(requiresPrivateProjectSource(selectedProject)&&!hasPrivateProjectSourceEntry()){renderContinue();return;}try{const expectedContext={sourceFingerprints:selectedProject.sourceFingerprints,workspaceObservation:selectedProject.workspaceObservation,viewedSession:selectedProject.session||null};lastContinue=await api(`/api/projects/${encodeURIComponent(selectedProject.id)}/continue?expectedContext=${encodeURIComponent(JSON.stringify(expectedContext))}`);renderContinue();}catch(error){notifyError(error);}});

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
function renderRelease(){if(releaseInfo?.readOnly){all('#inbox-form input, #inbox-form textarea, #inbox-form select, #inbox-form button, #session-form input, #session-form select, #session-form button, #write-token, #save-token, #workspace-list button').forEach(el=>el.disabled=true);}if(releaseInfo){$('#release-info').textContent=t(releaseInfo.joeyAcceptance==='PASSED'?'release.accepted':'release.pending',{version:releaseInfo.version,baseline:releaseInfo.parentBaseline.slice(0,7)});if(releaseInfo.developmentVersion)$('#release-info').textContent=t('runtime.candidate');if(releaseInfo.readOnly)$('#release-info').textContent+=' · '+t('release.snapshot',{time:displayTime(releaseInfo.snapshotGeneratedAt)});if(releaseInfo.developmentVersion)$('#release-info').textContent=t('human.release');$('#parent-baseline').textContent=releaseInfo.parentBaseline;}}

function renderInterpretation(){
  if(!lastInterpretation)return;const interpretation=lastInterpretation;
  $('#interpretation').replaceChildren(text('h3',t('inbox.previewTitle')),text('p',interpretation.ambiguity?t('inbox.ambiguous'):t('inbox.affected',{entity:displayValue(interpretation.affectedEntity)})),text('dl',''),list(t('inbox.proposedAction'),[interpretation.proposedAction]),list(t('inbox.expectedFiles'),interpretation.expectedCanonicalFiles),list(t('inbox.sideEffects'),interpretation.sideEffects.map(effect=>localizeMessage(effect))),text('p',localizeMessage(interpretation.approvalBoundary)));
}

async function mutateProjectState(manifest,command){
 notify('state.saving');
 try{const saved=await api(`/api/projects/${encodeURIComponent(manifest.project_id)}/project-state`,{method:'POST',body:JSON.stringify({...command,actor:'joey',confirmation:manifest.project_id,explicitDecision:'JOEY_APPROVES',expectedRevision:manifest.canonicalState.metadata.revision})});const current=manifests.get(manifest.project_id);manifests.set(manifest.project_id,{...current,canonicalState:saved,product:{...current.product,revision:saved.metadata.revision}});const disclosureClasses=['state-workbench','state-idea-entry','state-ideas','state-decision-entry','state-decision-history','state-next-entry','state-confirmations','state-project-sources','flight-recorder','state-audit'];const openPanels=[...document.querySelectorAll('.human-card')].map(card=>({id:card.id,classes:disclosureClasses.filter(cls=>card.querySelector('.'+cls)?.open)}));try{await reload();}catch{/* The POST succeeded; retain its confirmed result and show the refresh-failure banner. */}for(const panel of openPanels)for(const cls of panel.classes){const node=document.getElementById(panel.id)?.querySelector('.'+cls);if(node)node.open=true;}if(['ADD_IDEA','UPDATE_IDEA','CONVERT_IDEA'].includes(command.type)){const card=document.getElementById('mission-panel-'+manifest.project_id);for(const cls of ['state-workbench','state-ideas']){const node=card?.querySelector('.'+cls);if(node)node.open=true;}}notify('state.saved');return saved;}
 catch(error){notify('state.failed',{reason:error.message});throw error;}
}
function navigateContext(context,{push=true,render=true}={}){viewContext={project:context.project||selectedHumanProject,module:context.module||'overview',item:context.item||null};selectedHumanProject=viewContext.project;const hash=contextHash(viewContext,privateRouteOptions),advanced=context.mode==='advanced'||!context.mode&&new URLSearchParams(location.hash.split('?')[1]||'').get('mode')==='advanced';history[push?'pushState':'replaceState'](null,'',hash+(advanced?'&mode=advanced':''));show('joey');if(render)renderHuman();}
function proposalContext(p){return{project:p.parentAsset||p.sourceProjectId||selectedHumanProject,module:'proposal',item:p.id};}
function renderPendingProposals(){
 if(releaseInfo?.readOnly){$('#joey-content').prepend(text('p',contextWords(getLocale()).privateBoundary,'public-privacy-note'));const panel=document.getElementById('mission-panel-JOEY_ASSET_SYSTEM');panel?.insertBefore(renderPublicCases(publicCaseSnapshot,{locale:getLocale(),item:viewContext.item,onNavigate:navigateContext}),panel.children[1]||null);panel?.append(renderAssetCatalog(null,[],{locale:getLocale()}));return;}
 if(releaseInfo?.candidateStage!=='V0.3-E')return;
 const selected=viewContext.module==='proposal'?pendingProposals.filter(p=>p.id===viewContext.item):pendingProposals;
 const panel=renderProposals(selected,{locale:getLocale(),onOpen:p=>navigateContext(proposalContext(p)),onCreate:async input=>{const p=await api('/api/proposals',{method:'POST',body:JSON.stringify(input)});if(!pendingProposals.some(item=>item.id===p.id))pendingProposals=[...pendingProposals,p];try{await reload();}catch{/* Saving succeeded; keep the returned record while refresh remains unconfirmed. */}navigateContext(proposalContext(p));},onRefresh:()=>reload().catch(notifyError)});
 panel.dataset.proposalModule=viewContext.module==='ideas'?'ideas':viewContext.module==='proposal'?'detail':'home';
 if(viewContext.module==='ideas')panel.querySelector('h3').textContent=contextWords(getLocale()).ideas;
 if(viewContext.module==='proposal'){const back=text('button',contextWords(getLocale()).back,'button-glass');back.addEventListener('click',()=>navigateContext({project:selectedHumanProject,module:'ideas'}));panel.prepend(back);}
 $('#joey-content').prepend(panel);
 const assetCard=document.getElementById('mission-panel-JOEY_ASSET_SYSTEM');assetCard?.insertBefore(renderAssetCatalog(assetCatalog,pendingProposals,{locale:getLocale(),item:viewContext.module==='assets'?viewContext.item:null,onNavigate:navigateContext}),assetCard.children[1]||null);
 const add=document.querySelector('.mission-add');if(add){add.disabled=false;add.textContent=panel.querySelector('.proposal-create summary').textContent;add.removeAttribute('aria-label');add.title='';add.addEventListener('click',()=>{panel.querySelector('.proposal-create').open=true;panel.scrollIntoView({block:'start'});});}
}
function readSourceTrack(hash,project){return project==='JOEY_ASSET_SYSTEM'&&new URLSearchParams(hash.split('?')[1]||'').get('track')==='UNIVERSITY_CANDIDATE'?'UNIVERSITY_CANDIDATE':'BASELINE';}
function navigateWorkspace(context,{push=true}={}){const intent=workspaceRunSelection?.snapshot();if(intent&&(intent.projectId!==(context.project||selectedHumanProject)||intent.track!==(context.track??readSourceTrack(location.hash,context.project||selectedHumanProject)))){workspaceRunSelection.cancel();workspaceRunSelection=null;}viewContext={project:context.project||selectedHumanProject,module:'console',item:context.item||null};selectedHumanProject=viewContext.project;history[push?'pushState':'replaceState'](null,'',workspaceHash({...viewContext,track:context.track??readSourceTrack(location.hash,viewContext.project),filterKind:context.filterKind??readWorkspaceFilter(location.hash),panel:context.panel||readWorkspacePanel(location.hash),inspectorTab:context.inspectorTab||((context.item||'').startsWith('stage-')?'changes':'context')}));show('workspace');renderHuman();}
function openWorkspace(project=selectedHumanProject,{track=readSourceTrack(location.hash,project),runSelection=null}={}){workspaceRunSelection?.cancel();workspaceRunSelection=runSelection;navigateWorkspace(runSelection?.snapshot()?{project,track,panel:'events'}:lastWorkspaceRoute?.project===project&&(lastWorkspaceRoute.track||'BASELINE')===track?lastWorkspaceRoute:{project,track,panel:'events'});}
function navigateView(id){if(id==='workspace'){openWorkspace();return;}if(id==='project'&&selectedProject){detail(selectedProject);return;}if(id==='joey'){location.hash='#joey';return;}if(location.hash!=='#'+id)history.pushState(null,'','#'+id);show(id);}
function restoreRoute(){viewContext=readContext(location.hash,privateRouteOptions);selectedHumanProject=viewContext.project;const id=location.hash.slice(1).split('?')[0]||'joey';show(id);if(id==='project'&&state){const p=state.projects.find(p=>p.id===new URLSearchParams(location.hash.split('?')[1]||'').get('project'));if(p)detail(p,{restore:true});}if(id==='workspace')renderWorkspace();else if(id==='joey')renderHuman();}
window.addEventListener('popstate',restoreRoute);
window.addEventListener('hashchange',restoreRoute);
let workspaceRenderKey=null,workspaceRouteKey=null;
// The approved-project list expires in ~30 s; keep it fresh while the workspace is open so approved
// registered projects stay listed whichever entry opened it. The first read starts at once.
let workspaceConnectionTimer=null;
function keepWorkspaceConnection(){clearTimeout(workspaceConnectionTimer);workspaceConnectionTimer=null;if(!$('#workspace').classList.contains('active'))return;workspaceConnectionTimer=setTimeout(()=>{void authorizedProjectClient.refresh().catch(()=>{}).finally(keepWorkspaceConnection);},authorizedProjectClient.snapshot().length?15000:0);}
function renderWorkspace(){if(!state||!$('#workspace').classList.contains('active'))return;keepWorkspaceConnection();const authorizedProjects=authorizedProjectClient.snapshot().filter(p=>p.selectable),routeKey=JSON.stringify([location.hash,getLocale()]),renderKey=JSON.stringify([location.hash,getLocale(),[...manifests.values()],observerView,stageChangeView,authorizedProjects]);const mounted=$('#workspace-content').querySelector('#command-workspace');if(mounted&&!mounted.workbenchDisposed&&(workspaceRenderKey===renderKey||readFailed&&workspaceRouteKey===routeKey)){mounted.renderRefreshState?.(readingData,readFailed);mounted.updateTaskObservation?.(taskObservationView);const readtime=mounted.querySelector('.command-source-readtime');if(readtime)readtime.textContent=workspaceWords(getLocale()).readTime+' · '+(lastSuccessfulRead||workspaceWords(getLocale()).unknown);return;}workspaceRenderKey=renderKey;workspaceRouteKey=routeKey;if(location.hash.split('?')[0]==='#workspace')lastWorkspaceRoute={...viewContext,track:readSourceTrack(location.hash,viewContext.project),panel:readWorkspacePanel(location.hash),inspectorTab:readWorkspaceInspector(location.hash),filterKind:readWorkspaceFilter(location.hash)};replaceCommandWorkspace($('#workspace-content'),()=>renderCommandWorkspace([...manifests.values()],{locale:getLocale(),observerView,stageChangeView,taskObservationView,initialRunSelection:workspaceRunSelection,authorizedProjects,projectConnectionFor:id=>authorizedProjects.some(p=>p.projectId===id)?authorizedProjectClient.select(id):null,readOnly:!!releaseInfo?.readOnly,context:{...viewContext,track:readSourceTrack(location.hash,viewContext.project)},panel:readWorkspacePanel(location.hash),inspectorTab:readWorkspaceInspector(location.hash),filterKind:readWorkspaceFilter(location.hash),lastReadAt:lastSuccessfulRead,failed:readFailed,reading:readingData,onNavigate:navigateWorkspace,onPanel:panel=>navigateWorkspace({...viewContext,panel,inspectorTab:readWorkspaceInspector(location.hash)}),onBack:()=>{location.hash='#joey';},onRefresh:()=>reload().catch(notifyError),onInspect:id=>{const p=state.projects.find(p=>p.id===id);if(p)detail(p);},onDecisions:id=>{navigateContext({project:id,module:'overview'});const panel=document.querySelector('#mission-panel-'+id+' .joey-decision-panel, #mission-panel-'+id+' .state-decision-entry');if(panel){if(panel.tagName==='DETAILS')panel.open=true;panel.scrollIntoView({block:'center'});}}}));renderDataStatus();}


// Control Tower is the default daily entry; the previous overview stays at #joey?view=classic.
// The overview replaces the retired pages (classic Joey View, console, inbox, workspaces, evidence, project); only the technical workspace keeps its own route.
function isTowerRoute(){return location.hash.split('?')[0]!=='#workspace';}
let towerFilter='all',towerRuns={},towerDemoStorage=null;
// List or board layout of the tower; a local display preference only (not synced, not data).
const TOWER_VIEW_KEY='mc.tower.view.v1';let towerView=(()=>{try{return localStorage.getItem(TOWER_VIEW_KEY)==='board'?'board':'list';}catch{return 'list';}})();
function memoryStorage(seed){const data={'mc.tower.handoffs.v1':JSON.stringify(seed)};return{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v);}};}
let towerIdeas=[],towerOwnerReady=false,towerDemoIdeas=[],towerRegistered=[];
// Handoff intents, reviews and idea decisions: local first, synced to the Owner cloud while signed in.
const towerStore=createTowerStore({push:patchOwnerTowerState,isOnline:()=>towerOwnerReady});
// Joey's decision on an idea card ('go' or 'shelved'), kept in this browser.
const IDEA_DECISIONS='mc.tower.ideaDecisions.v1';
function ideaDecisions(){try{const v=JSON.parse(towerStore.storage.getItem(IDEA_DECISIONS)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
function decideIdeaCard(id,decision){const all=ideaDecisions();if(decision)all[id]=decision;else delete all[id];towerStore.storage.setItem(IDEA_DECISIONS,JSON.stringify(all));}
// Private idea drafts appear as "your call" cards next to registered projects.
const LOCAL_IDEAS='mc.tower.localIdeas.v1';
// Without Owner sign-in (e.g. the public read-only site) ideas stay in this browser only.
function localIdeas(){try{const v=JSON.parse(localStorage.getItem(LOCAL_IDEAS)||'[]');return Array.isArray(v)?v.filter(i=>i&&typeof i.id==='string'&&typeof i.idea==='string'):[];}catch{return [];}}
function saveLocalIdea(text){const at=new Date().toISOString(),idea={id:'local_'+Date.now().toString(36),name:text.split(/\r?\n/)[0].replace(/\s+/g,' ').slice(0,40).trim(),idea:text,at};try{localStorage.setItem(LOCAL_IDEAS,JSON.stringify([idea,...localIdeas()].slice(0,50)));}catch{throw Error('LOCAL_STORAGE_UNAVAILABLE');}return idea;}
const ideaCards=drafts=>{const decided=ideaDecisions(),card=(id,name,idea,at)=>({id,name,status:['go',...JOEY_STATUSES].includes(decided[id])?'Active':'Idea',summary:idea,updatedAt:at,kind:'draft',decision:decided[id]||null});return [...drafts.map(d=>card(d.draftId,d.project.name,d.project.idea,d.updatedAt)),...localIdeas().map(i=>card(i.id,i.name,i.idea,i.at))].filter(c=>c.decision!=='removed');};
// Joey's own status per project (keep pushing / paused / done), stored with his other synced decisions.
const JOEY_STATUSES=['push','paused','done'];
// Guests see Joey's own status label only (public read-only endpoint); Owner uses the private synced state.
let guestStatuses={};
async function readPublicTowerStatus(){try{const r=await fetch('/api/public/tower-status',{cache:'no-store',credentials:'omit'});const b=r.ok?await r.json():null;return b?.qualification==='PUBLIC_OWNER_STATUS_LABELS'&&b.statuses&&typeof b.statuses==='object'?b.statuses:null;}catch{return null;}}
function withJoeyStatus(list){const decided=towerOwnerReady?ideaDecisions():{...ideaDecisions(),...guestStatuses};return list.map(p=>JOEY_STATUSES.includes(decided[p.id])?{...p,joeyStatus:decided[p.id]}:p);}
function towerProjects(){return withJoeyStatus([...(state?.projects||[]).map(p=>({id:p.id,name:p.name?.value||p.id,status:p.status?.value,version:p.version?.value,lastAgent:p.lastAI?.value,updatedAt:p.lastUpdated?.value,next:p.nextAction?.value,siteUrl:(p.projectUrls?.entries||[]).find(e=>/^https:\/\//.test(e.url||'')&&/^active/.test(e.status||''))?.url||null})),...registeredCards(),...ideaCards(towerIdeas)]);}
// Projects registered in the private MC catalog that are not already on the published list.
// Version, Agent and date come from the catalog record (CURRENT_STATE.md yaml: version, current_agent, as_of).
function registeredCards(){const known=new Set((state?.projects||[]).map(p=>p.id)),decided=ideaDecisions();return towerRegistered.filter(r=>!known.has(r.projectId)).map(r=>{const status=String(r.project?.status?.value||'');return {id:r.projectId,name:r.name,kind:'registered',decision:decided[r.projectId]||null,repositoryId:r.repositoryId,ref:r.ref,status:/pending|idea|planned|paused/i.test(status)||!status?'Idea':status,version:r.project?.version?.value,lastAgent:r.project?.lastAI?.value,asOf:r.project?.lastUpdated?.value||null,siteUrl:typeof r.siteUrl==='string'&&/^https:\/\//.test(r.siteUrl)?r.siteUrl:null,workLog:Array.isArray(r.workLog)?r.workLog:[],live:Object.hasOwn(towerRuns,r.projectId),updatedAt:r.project?.lastUpdated?.value||r.registeredAt,next:r.project?.nextAction?.value};});}
// Cloud drafts cannot be deleted through the draft API, so removal hides them; local ideas are deleted.
function removeIdea(id){if(id.startsWith('local_')){try{localStorage.setItem(LOCAL_IDEAS,JSON.stringify(localIdeas().filter(i=>i.id!==id)));}catch{}decideIdeaCard(id,null);}else decideIdeaCard(id,'removed');}
async function editIdea(id,{name,idea}){if(id.startsWith('local_')){const list=localIdeas().map(i=>i.id===id?{...i,name,idea,at:new Date().toISOString()}:i);try{localStorage.setItem(LOCAL_IDEAS,JSON.stringify(list));}catch{throw Error('LOCAL_STORAGE_UNAVAILABLE');}return;}const draft=towerIdeas.find(d=>d.draftId===id);if(!draft)throw Error('DRAFT_NOT_FOUND');const saved=await updateOwnerIdea(draft,{name,idea});towerIdeas=towerIdeas.map(d=>d.draftId===id?saved:d);}
async function towerIdea(text){if(!towerOwnerReady){saveLocalIdea(text);return;}if(towerIdeas.length>=12)throw Error('IDEA_LIMIT');const draft=await saveOwnerIdea(text);towerIdeas=[draft,...towerIdeas.filter(d=>d.draftId!==draft.draftId)];}

function renderTower(){
 const demo=new URLSearchParams(location.hash.split('?')[1]||'').get('demo')==='1',locale=getLocale();
 if(simpleJoeyView){simpleJoeyView.dispose();simpleJoeyView=null;}
 document.body.classList.add('tower-mode');$('#cockpit-sidebar')?.remove();$('#cockpit-command-readouts')?.remove();
 if(demo&&!towerDemoStorage)towerDemoStorage=memoryStorage(demoHandoffs(Date.now()));
 const data=demo?(d=>({...d,projects:withJoeyStatus([...d.projects.map(p=>p.kind==='registered'?{...p,decision:ideaDecisions()[p.id]||null}:p),...towerDemoIdeas.map(i=>({...i,status:ideaDecisions()[i.id]==='go'?'Active':'Idea',decision:ideaDecisions()[i.id]||null}))])}))(demoTower()):{projects:towerProjects(),runsByProject:towerRuns};
 const account=demo?null:towerAccount(locale),ownerSiteUrl=location.origin!==ownerAuthConfig.stageOrigin&&/^https:/.test(location.origin)?ownerAuthConfig.stageOrigin+'/#joey':null;
 const loading=demo?null:towerRefresh.phase;
 const guest=!demo&&!towerOwnerReady&&loading!=='loading';
 const tower=renderControlTower({locale,...data,demo,guest,ownerSiteUrl,signedIn:demo||towerOwnerReady,loading:loading==='loading',loadingSlow:loading==='slow',filter:towerFilter,storage:demo?towerDemoStorage:towerStore.storage,account,
  onFilter:f=>{towerFilter=f;renderTower();},view:(h=>['board','list'].includes(h)?h:towerView)(new URLSearchParams(location.hash.split('?')[1]||'').get('view')),onView:v=>{if(new URLSearchParams(location.hash.split('?')[1]||'').has('view')){const q=new URLSearchParams(location.hash.split('?')[1]||'');q.delete('view');location.hash='#joey'+(q.toString()?'?'+q:'');}towerView=v==='board'?'board':'list';try{localStorage.setItem(TOWER_VIEW_KEY,towerView);}catch{}renderTower();},onChange:renderTower,onLocale:applyLocale,
  onStatus:(id,status,{silent=false}={})=>{decideIdeaCard(id,status);if(!silent)renderTower();},
  onDecision:(id,choice)=>{if(demo&&id==='DEMO_R'){decideIdeaCard(id,{reject:'rejected',remove:'removed',restore:null}[choice]??null);renderTower();return;}if(demo&&!id.startsWith('local_')){notify('human.saved');return;}if(towerRegistered.some(r=>r.projectId===id)){decideIdeaCard(id,{reject:'rejected',remove:'removed',restore:null}[choice]??null);renderTower();return;}if(id.startsWith('draft_')||id.startsWith('local_')){if(choice==='remove')removeIdea(id);else decideIdeaCard(id,{continue:'go',shelve:'shelved',restore:null}[choice]);renderTower();return;}if(!releaseInfo?.readOnly)decideIdea(id,choice);},
  onIdea:demo?async text=>{towerDemoIdeas=[{id:'local_demo'+towerDemoIdeas.length,name:text.slice(0,40),status:'Idea',summary:text,updatedAt:new Date().toISOString(),kind:'draft'},...towerDemoIdeas];}:towerIdea,onIdeaEdit:demo?null:editIdea,signedInForIdeas:demo||towerOwnerReady,
  onDetails:id=>{if(!demo)void ensureAuthorizedProject(id).then(()=>openWorkspace(id));},
  onAdvanced:()=>openWorkspace(),detailId:new URLSearchParams(location.hash.split('?')[1]||'').get('detail'),onOpenDetail:id=>{location.hash='#joey?'+new URLSearchParams({...(demo?{demo:'1'}:{}),detail:id});setTimeout(()=>scrollTo({top:0}),0);},onBack:()=>{location.hash=demo?'#joey?demo=1':'#joey';setTimeout(()=>scrollTo({top:0}),0);},
  mountHandoff:demo?null:mountTowerHandoff,
  prepareInstruction:demo?async()=>'（示範）這裡會放入該項目最新、已核對的完整交接內容。':null});
 $('#joey-content').replaceChildren(tower);
 if(!loading||loading==='ready')for(const c of tower.towerModel.cards){const key=c.at||'';if(towerSeen.has(c.id)&&towerSeen.get(c.id)!==key)tower.querySelector(`[data-project="${CSS.escape(c.id)}"]`)?.classList.add('tower-pulse');towerSeen.set(c.id,key);}
 scheduleTowerRefresh(demo);
}
const towerSeen=new Map();
// The Owner sign-in entry is shared; it moves into the handoff sheet while that is open.
function towerAccount(locale){try{return mountOwnerBrowserEntry({doc:document,locale,projectId:'NEXAEON'});}catch{return null;}}
// Registered projects with an approved live source are only known to the takeover after the
// authorized connection list is fetched; load it first so the sheet mounts the live entry.
function ensureAuthorizedProject(projectId){if((state?.projects||[]).some(p=>p.id===projectId)||authorizedProjectClient.snapshot().some(p=>p.projectId===projectId&&p.selectable))return Promise.resolve();return authorizedProjectClient.refresh().then(()=>{},()=>{});}
function mountTowerHandoff(host,{projectId,decorate,onCopied}){let view=null,disposed=false;const mount=()=>{if(disposed)return;view=mountJoeyTakeover({locale:getLocale(),projectConnectionClient:authorizedProjectClient,project:projectId,track:'BASELINE',publicProjects:state.projects,publicCases:publicCaseSnapshot,decorateInstruction:decorate,onCopied});view.root.classList.add('tower-takeover');const scope=view.root.querySelector('.project-handoff-scope');if(scope)view.root.prepend(scope);host.append(view.root);};void ensureAuthorizedProject(projectId).then(mount);return()=>{disposed=true;view?.dispose();};}
// Reads Agent reports about every 30 s while the tower is visible; never while a sheet is open.
// The first read starts immediately and the board shows a loading state until it settles.
const registeredKey=list=>JSON.stringify((list||[]).map(r=>[r.projectId,r.name,r.project?.status?.value,r.project?.version?.value,r.project?.lastAI?.value,r.project?.lastUpdated?.value]));
// Guests: read-only live run summaries (server-sanitized), no Owner session.
async function readPublicTowerRuns(ids){const out={};await Promise.all(ids.map(async id=>{try{const r=await fetch('/api/public/tower-runs?project='+encodeURIComponent(id),{cache:'no-store',credentials:'omit'});if(!r.ok)return;const b=await r.json();if(b?.projectId===id&&b.runs?.qualification==='PUBLIC_READ_ONLY_RUN_SUMMARY')out[id]=b.runs;}catch{}}));return Object.keys(out).length?out:null;}
async function readTower(){const ids=(state?.projects||[]).map(p=>p.id);const registeredRead=readOwnerRegisteredProjects().catch(()=>null),registeredRuns=registeredRead.then(list=>list?.length?readOwnerTowerRuns(list.map(r=>r.projectId).filter(id=>!ids.includes(id))).catch(()=>null):null);const [fixedRuns,ideas,registered,extraRuns]=await Promise.all([readOwnerTowerRuns(ids).catch(()=>null),listOwnerIdeaDrafts().catch(()=>null),registeredRead,registeredRuns]);const runs=fixedRuns&&{...fixedRuns,...(extraRuns||{})};let registeredChanged=false;if(registered&&registeredKey(registered)!==registeredKey(towerRegistered)){towerRegistered=registered;registeredChanged=true;}const ready=!!(runs||ideas),wasReady=towerOwnerReady;const [guestRuns,guestStatusRead]=runs?[null,null]:await Promise.all([readPublicTowerRuns(ids),readPublicTowerStatus()]);let statusChanged=false;if(guestStatusRead&&JSON.stringify(guestStatusRead)!==JSON.stringify(guestStatuses)){guestStatuses=guestStatusRead;statusChanged=true;}towerOwnerReady=ready;const synced=ready?await towerStore.sync(readOwnerTowerState).catch(()=>false):false;const changed=statusChanged||registeredChanged||synced||ready!==wasReady||(runs||guestRuns)&&JSON.stringify(runs||guestRuns)!==JSON.stringify(towerRuns)||ideas&&JSON.stringify(ideas)!==JSON.stringify(towerIdeas);if(runs)towerRuns=runs;else if(guestRuns)towerRuns=guestRuns;if(ideas)towerIdeas=ideas;return {ready,changed:!!changed};}
const towerRefresh=createTowerRefresh({read:readTower,render:()=>renderTower(),canRefresh:()=>isTowerRoute()&&!document.hidden&&!document.querySelector('.tower-sheet[open]')});
function scheduleTowerRefresh(demo){if(demo)return;towerRefresh.schedule();}

async function decideIdea(id,choice){const m=[...manifests.values()].map(m=>presentCanonicalProject(m,getLocale())).find(m=>m.project_id===id);if(!m)return;const lifecycle=choice==='continue'?'IN_PROGRESS':'PAUSED';try{if(m.canonicalState){await mutateProjectState(m,{type:'SET_LIFECYCLE',lifecycle:lifecycle==='IN_PROGRESS'?'DEVELOPING':lifecycle,completionConfirmed:false});return;}await api(`/api/projects/${encodeURIComponent(id)}/owner-decisions`,{method:'POST',body:JSON.stringify({actor:'joey',confirmation:id,explicitDecision:'JOEY_APPROVES',expectedRevision:m.product.revision,lifecycle})});await reload();notify('human.saved');}catch(e){notifyError(e);}}
function isSimpleJoeyRoute(){const route=location.hash.split('?')[0];return (!route||route==='#joey')&&viewContext.module==='overview'&&new URLSearchParams(location.hash.split('?')[1]||'').get('mode')!=='advanced';}
function navigateSimpleJoey(project,track='BASELINE',daily='projects'){const q=new URLSearchParams({project,module:'overview',daily});if(project==='JOEY_ASSET_SYSTEM'&&track==='UNIVERSITY_CANDIDATE')q.set('track',track);history.pushState(null,'','#joey?'+q);restoreRoute();}
function renderSimpleJoey(){const locale=getLocale();renderVisualChrome([...manifests.values()].map(m=>presentCanonicalProject(m,locale)),locale);$('#cockpit-sidebar')?.remove();$('#cockpit-command-readouts')?.remove();if(!simpleJoeyView){simpleJoeyView=mountJoeyTakeover({locale,projectConnectionClient:authorizedProjectClient,project:selectedHumanProject,track:readSourceTrack(location.hash,selectedHumanProject),publicProjects:state.projects,publicCases:publicCaseSnapshot,dailySection:new URLSearchParams(location.hash.split('?')[1]||'').get('daily')||'projects',onDaily:daily=>navigateSimpleJoey(selectedHumanProject,readSourceTrack(location.hash,selectedHumanProject),daily),onSelect:(project,track)=>navigateSimpleJoey(project,track,new URLSearchParams(location.hash.split('?')[1]||'').get('daily')||'projects'),onWorkspace:(project,runSelection)=>openWorkspace(project,{track:readSourceTrack(location.hash,project),runSelection}),onFull:project=>navigateContext({project,module:'overview',mode:'advanced'})});$('#joey-content').replaceChildren(simpleJoeyView.root);}else simpleJoeyView.update({locale,project:selectedHumanProject,track:readSourceTrack(location.hash,selectedHumanProject),publicProjects:state.projects,publicCases:publicCaseSnapshot,dailySection:new URLSearchParams(location.hash.split('?')[1]||'').get('daily')||'projects'});renderDataStatus();}
function renderHuman(){if(!state)return;if(isTowerRoute()){renderTower();return;}document.body.classList.remove('tower-mode');if(selectedHumanProject==='MISSION_CONTROL'&&location.hash.split('?')[0]==='#joey'&&new URLSearchParams(location.hash.split('?')[1]||'').get('mode')==='advanced'){navigateWorkspace({project:'MISSION_CONTROL',track:'BASELINE',panel:'events'},{push:false});return;}if(isSimpleJoeyRoute()){renderSimpleJoey();return;}if(simpleJoeyView){simpleJoeyView.dispose();simpleJoeyView=null;}const entries=[...manifests.values()].map(m=>presentCanonicalProject(m,getLocale()));renderVisualChrome(entries,getLocale());$('#cockpit-sidebar')?.remove();document.querySelector('body>nav').append(renderSidebar(entries,{doc:document,locale:getLocale(),w:humanWords(getLocale()),proposals:releaseInfo?.readOnly?[]:pendingProposals,onProjectSelect:id=>navigateContext({project:id,module:id==='JOEY_ASSET_SYSTEM'?'assets':'overview'}),onLifecycle:lifecycle=>{if(lifecycle==='IDEA'&&!releaseInfo?.readOnly){navigateContext({project:selectedHumanProject,module:'ideas'});return;}show('joey');const board=document.querySelector('.board-toggle');if(board){board.open=true;board.scrollIntoView({block:'start',behavior:'auto'});const lane=board.querySelector('[data-lifecycle='+lifecycle+']');lane?.scrollIntoView({block:'nearest',inline:'center',behavior:'auto'});}}}));$('#cockpit-command-readouts')?.remove();document.querySelector('header').append(renderCommandReadouts(entries,{health:releaseInfo}));$('#product-evidence').replaceChildren(...entries.map(m=>list(m.product.name,[...m.product.evidence.map(e=>e.reference),...Object.values(m.product.sourceEvidence).filter(Boolean).map(e=>e.sourcePath+' · '+e.sourceSection)])));$('#joey-content').replaceChildren(renderJoeyView(entries,{onRefresh:()=>reload().catch(notifyError),selectedProjectId:selectedHumanProject,onMutation:mutateProjectState,onSelect:id=>{if(location.hash.split('?')[0]==='#workspace'&&(viewContext.project==='MISSION_CONTROL'||!manifests.has(viewContext.project)))return;if(selectedHumanProject!==id){navigateContext({project:id,module:id==='JOEY_ASSET_SYSTEM'?'assets':'overview'},{render:false});queueMicrotask(renderHuman);}selectedHumanProject=id;},readOnly:!!releaseInfo?.readOnly,onAgent:id=>{const p=state.projects.find(p=>p.id===id);if(p)detail(p);},onMove:async(m,lifecycle,words)=>{if(['COMPLETED','ARCHIVED'].includes(lifecycle)&&!window.confirm(words.finish))return;try{if(m.canonicalState){await mutateProjectState(m,{type:'SET_LIFECYCLE',lifecycle:lifecycle==='IN_PROGRESS'?'DEVELOPING':lifecycle,completionConfirmed:['COMPLETED','ARCHIVED'].includes(lifecycle)});return;}await api(`/api/projects/${encodeURIComponent(m.project_id)}/owner-decisions`,{method:'POST',body:JSON.stringify({actor:'joey',confirmation:m.project_id,explicitDecision:'JOEY_APPROVES',expectedRevision:m.product.revision,lifecycle})});await reload();notify('human.saved');}catch(e){notifyError(e);}},onProposal:async(m,input)=>{try{await api(`/api/projects/${encodeURIComponent(m.project_id)}/owner-proposals`,{method:'POST',body:JSON.stringify(input)});await reload();notify('human.proposed');}catch(e){notifyError(e);}},onApprove:async(m,proposal,words)=>{if(!window.confirm(words.confirm))return;try{await api(`/api/projects/${encodeURIComponent(m.project_id)}/owner-decisions`,{method:'POST',body:JSON.stringify({actor:'joey',confirmation:m.project_id,explicitDecision:'JOEY_APPROVES',expectedRevision:m.product.revision,proposalId:proposal.id})});await reload();notify('human.saved');}catch(e){notifyError(e);}}}));renderPendingProposals();const entry=text('button',workspaceWords(getLocale()).open,'workspace-entry button-glass');entry.type='button';entry.addEventListener('click',()=>openWorkspace());document.querySelector('.project-switcher')?.after(entry);renderWorkspace();renderDataStatus();}

function render(snapshot){state=snapshot;renderHuman();$('#freshness').textContent=t('header.generated',{time:displayTime(snapshot.generatedAt)});filterProjects(activeFilter);renderWorkspaces(snapshot);renderRelease();renderHandoffs(snapshot);renderAttention(snapshot);const select=$('#session-entity'),chosen=select.value;select.replaceChildren(...snapshot.projects.map(project=>{const option=text('option',`${project.id} · ${displayValue(value(project.name))}`);option.value=project.id;return option;}));if(chosen)select.value=chosen;if(location.hash.startsWith('#project?')){const p=snapshot.projects.find(p=>p.id===new URLSearchParams(location.hash.split('?')[1]).get('project'));if(p)detail(p,{restore:true});}if(selectedProject){selectedProject=snapshot.projects.find(project=>project.id===selectedProject.id)||null;if(selectedProject)renderDetailPanels(selectedProject);}}

// Switching language re-renders the cached snapshot only: no API call, no write, and no canonical value is changed.
function applyLocale(locale){setLocale(locale);$('#locale-select').value=getLocale();applyStaticTranslations(document);if(state)render(state);renderContinue();renderInterpretation();renderInbox();renderRelease();renderNotice();}
$('#locale-select').addEventListener('change',event=>applyLocale(event.target.value));
initLocale();applyLocale(getLocale());

all('[data-filter]').forEach(button=>button.addEventListener('click',()=>filterProjects(button.dataset.filter)));
$('#inbox-form').addEventListener('submit',async event=>{event.preventDefault();try{const item=await api('/api/inbox',{method:'POST',body:JSON.stringify({rawText:$('#rawText').value,type:$('#kind').value})});if(['Needs review','Ready to confirm'].includes(item.state)){const preview=await api(`/api/inbox/${item.id}/interpret`,{method:'POST',body:'{}'});lastInterpretation=preview.interpretation;renderInterpretation();}await reloadInbox();notify('workflow.saved');}catch(error){notifyError(error);}});
$('#session-form').addEventListener('submit',async event=>{event.preventDefault();try{await api('/api/sessions',{method:'POST',body:JSON.stringify({entityId:$('#session-entity').value,ai:$('#session-ai').value,model:$('#session-model').value,workspaceId:$('#session-workspaceId').value,path:$('#session-path').value,declaredTask:$('#session-declaredTask').value,permissionBoundary:$('#session-permissionBoundary').value})});await reload();notify('session.created');}catch(error){notifyError(error);}});

reload().then(()=>reloadInbox()).catch(notifyError);if(location.hash.startsWith('#joey?')&&viewContext.module==='console')navigateWorkspace({...viewContext,panel:'events'},{push:false});else show(location.hash.slice(1).split('?')[0]||'joey');

$('#refresh-state').addEventListener('click',()=>reload().catch(notifyError));

// Re-resolve an explicit private route only after a fresh authenticated catalog;
// registered-only URLs cannot create private project state or a source scope.
authorizedProjectClient.subscribe(()=>{const next=readContext(location.hash,privateRouteOptions);if(next.project!==selectedHumanProject&&['#joey','#workspace'].includes(location.hash.split('?')[0])){restoreRoute();return;}renderWorkspace();});
