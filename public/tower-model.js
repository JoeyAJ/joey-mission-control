// Control Tower model: reduces project records, Agent self-reports and local handoff
// intents to one plain status per project. It never infers that an Agent started from
// a copy click: a handoff stays "awaiting" until that Agent's own report arrives.
export const TOWER_STATES=['blocked','stale','review','decide','running','awaiting','push','paused','idea','done'];
// Board groups below "needs you": Agent working now, Joey keeps pushing, paused, done.
export const GROUPS=[['running',['running','awaiting']],['push',['push']],['paused',['paused']],['done',['done']]];
// Joey's own status for a project (synced with his other tower records); Agents never set it.
export const JOEY_STATUSES=['push','paused','done'];
export const ATTENTION_STATES=new Set(['blocked','stale','review','decide']);
// Board view (alternative layout of the same cards): four columns derived from TOWER_STATES.
// Blocked and stale cards stay in "in development" but are flagged "needs you"; a finished
// run never goes past "awaiting your review" until Joey records a decision himself.
export const BOARD_COLUMNS=[['pickup',['decide','awaiting','push','paused','idea']],['running',['running','blocked','stale']],['review',['review']],['done',['done']]];
export const NEEDS_YOU_STATES=new Set(['blocked','stale']);
export function boardColumn(state){return BOARD_COLUMNS.find(([,states])=>states.includes(state))?.[0]||'pickup';}
export function boardColumns(cards=[]){return BOARD_COLUMNS.map(([key,states])=>({key,cards:cards.filter(c=>states.includes(c.state)).map(c=>({...c,needsYou:NEEDS_YOU_STATES.has(c.state)}))}));}
// Heartbeat freshness comes only from the Agent's own report: "fresh" while the run is
// reported running and not expired, "stale" once it expired, otherwise "none".
export function heartbeatOf(card){return card?.state==='running'&&card.focusState==='running'?'fresh':card?.state==='stale'||card?.focusState==='unconfirmed'?'stale':'none';}
// Run timeline and touched files for one run, straight from its reported events.
export function runTimeline(events=[],runId=null){if(!runId)return [];return events.filter(e=>e&&e.runId===runId&&typeof e.kind==='string').sort((a,b)=>(a.sequence??0)-(b.sequence??0)||String(a.eventAt).localeCompare(String(b.eventAt))).map(e=>({sequence:e.sequence??null,kind:e.kind,eventAt:e.eventAt||null,summary:e.summary||null,activity:e.activity||null}));}
export function touchedFiles(timeline=[]){const out=new Map();for(const e of timeline){const a=e.activity;if(!a||typeof a.path!=='string'||!a.path.trim()||!['FILE_READ','FILE_CHANGED'].includes(a.action))continue;const prev=out.get(a.path);out.set(a.path,{path:a.path,read:(prev?.read||false)||a.action==='FILE_READ',changed:(prev?.changed||false)||a.action==='FILE_CHANGED',at:a.observedAt||e.eventAt||prev?.at||null});}return [...out.values()];}
export const AGENTS=[
 {id:'codex',name:'Codex',match:/codex/i},
 {id:'claude',name:'Claude Code',match:/claude/i},
 {id:'hermes',name:'Hermes',match:/hermes/i},
 {id:'cursor',name:'Cursor',match:/cursor/i}
];
// Older handoff intents are dropped so a forgotten paste does not wait forever.
export const HANDOFF_TTL_MS=72*3600*1000;
export function agentKey(name){if(!name)return null;return AGENTS.find(a=>a.match.test(name))?.id||'other';}
export function agentName(key,fallback){return AGENTS.find(a=>a.id===key)?.name||fallback||key;}
const known=v=>typeof v==='string'&&v.trim()&&!/^unknown$/i.test(v.trim())?v.trim():null;
// Agents are asked to start featureTitle with the stage version ("v0.4 · goal").
export const versionOf=title=>/^\s*v(\d+(?:\.\d+){0,3}[A-Za-z0-9.-]*)\b/i.exec(title||'')?.[1]||null;
const time=v=>{const t=Date.parse(v);return Number.isFinite(t)?t:null;};
// Catalog records (mc/registry CURRENT_STATE.md) carry a date-only as_of; it covers that whole day.
const DAY_MS=24*3600*1000;
export function catalogTime(v){const t=time(v);if(t===null)return null;return /^\d{4}-\d{2}-\d{2}$/.test(String(v).trim())?t+DAY_MS-1:t;}
function lifecycleOf(project){
 const raw=String(project.lifecycle||project.status||'').toUpperCase();
 if(['IDEA','PLANNED','PLANNING'].includes(raw))return 'idea';
 if(raw==='PAUSED')return 'paused';
 if(['COMPLETED','ARCHIVED'].includes(raw))return 'done';
 return 'active';
}
export function projectCard(project,{runs=null,handoff=null,review=null,now=Date.now()}={}){
 const tasks=runs?.tasks||[],latest=tasks[0]||null,active=runs?.active||[],lifecycle=lifecycleOf(project);
 const current=active[0]||null;
 const blocked=(runs?.blockers||[])[0]||null,doneAt=tasks.findIndex(t=>['completed','failed'].includes(t.currentState)),
  // A silent run is only "may have stopped" when no newer run has already finished; completed runs never are.
  stale=tasks.find((t,i)=>(doneAt<0||i<doneAt)&&t.currentState==='unconfirmed'&&['running','blocked'].includes(t.reportedState))||null;
 // Registered projects without live reports use the work log from their catalog record.
 const log=!tasks.length&&project.kind==='registered'&&Array.isArray(project.workLog)?project.workLog.filter(e=>e&&time(e.at)!==null&&known(e.agent)):[];
 const history=tasks.length?tasks.map(t=>({agent:t.agentName,agentKey:agentKey(t.agentName),feature:t.featureTitle,state:t.currentState,at:t.eventAt})):log.map(e=>({agent:e.agent,agentKey:agentKey(e.agent),feature:e.summary,state:e.state,at:e.at}));
 const logged=log[0]||null;
 const completed=!current&&latest?.currentState==='completed'?latest:null;
 // Last finished run Joey already reviewed; the card lets Joey revisit that decision.
 const reviewed=completed&&review&&completed.runId&&review.runId===completed.runId?{runId:completed.runId,decision:review.decision,agent:completed.agentName,feature:completed.featureTitle,summary:completed.summary,result:completed.result||null}:null;
 const joeyStatus=JOEY_STATUSES.includes(project.joeyStatus)?project.joeyStatus:null,parked=joeyStatus==='paused'||joeyStatus==='done';
 const base={joeyStatus,id:project.id,name:project.name,kind:project.kind||'project',live:project.kind==='registered'&&project.live===true,decision:project.decision||null,summary:project.summary||null,siteUrl:project.siteUrl||null,repositoryId:project.repositoryId||null,ref:project.ref||null,asOf:project.asOf||null,reviewed,version:versionOf(current?.featureTitle)||versionOf(latest?.featureTitle)||known(project.version),lifecycle,history,
  lastAgent:latest?.agentName||known(project.lastAgent)||logged?.agent||null,
  updatedAt:latest?.eventAt||logged?.at||project.updatedAt||null,
  next:known(project.next)};
 // A handoff is settled once the receiving Agent reports after the copy time.
 let pending=null;const handoffAt=time(handoff?.at);
 // Registered projects have no live reports yet: their catalog record settles the handoff once
 // it names the receiving Agent with an as_of at or after the copy time.
 const catalogAnswered=()=>project.kind==='registered'&&(agentKey(known(project.lastAgent))===handoff.agent&&catalogTime(project.asOf)>=handoffAt||log.some(e=>agentKey(e.agent)===handoff.agent&&time(e.at)>=handoffAt));
 if(handoff&&handoffAt&&now-handoffAt<HANDOFF_TTL_MS){const answered=tasks.some(t=>agentKey(t.agentName)===handoff.agent&&time(t.eventAt)>=handoffAt)||catalogAnswered();if(!answered)pending={agent:handoff.agent,agentName:agentName(handoff.agent),goal:handoff.goal||'',at:handoff.at};}
 // The run the detail timeline follows: current, else stale, else the latest report.
 const focus=current||stale||latest,timeline=runTimeline(runs?.events||[],focus?.runId||null);
 const card=(state,extra={})=>({...base,state,pending,focusRunId:focus?.runId||null,focusState:focus?.currentState||null,timeline,files:touchedFiles(timeline),...extra});
 // Joey paused or closed the project: Agent problems and reviews no longer ask for attention.
 if(blocked&&!parked)return card('blocked',{agent:blocked.agentName,feature:blocked.featureTitle,summary:blocked.summary,at:blocked.eventAt});
 if(stale&&!current&&!parked)return card('stale',{agent:stale.agentName,feature:stale.featureTitle,summary:stale.summary,at:stale.eventAt});
 if(pending)return card('awaiting',{agent:pending.agentName,feature:pending.goal,summary:null,at:pending.at,previousAgent:current?.agentName||base.lastAgent});
 // A finished run waits for Joey's review until Joey records a decision for that run.
 if(!current&&latest?.currentState==='completed'&&lifecycle==='active'&&!parked&&review?.runId!==latest.runId)return card('review',{agent:latest.agentName,feature:latest.featureTitle,summary:latest.summary,at:latest.eventAt,runId:latest.runId,result:latest.result||null});
 // A blocked run on a paused/closed project is not "in development".
 if(current&&!(parked&&current.currentState!=='running'))return card('running',{agent:current.agentName,feature:current.featureTitle,summary:current.summary,at:current.eventAt});
 if(lifecycle==='idea')return card('decide',{agent:null,feature:null,summary:project.summary||null,at:base.updatedAt});
 const rest=state=>card(state,{agent:null,feature:latest?.featureTitle||logged?.summary||null,summary:latest?.summary||null,at:base.updatedAt});
 if(joeyStatus)return rest(joeyStatus);
 if(lifecycle==='paused')return rest('paused');
 if(lifecycle==='done')return rest('done');
 // Everything else that is active stays on Joey's list until he pauses or closes it.
 return rest('push');
}
export function towerModel({projects=[],runsByProject={},handoffs={},reviews={},now=Date.now()}={}){
 const order=new Map(TOWER_STATES.map((s,i)=>[s,i]));
 // Shelved ideas leave the board but stay listed so they can be restored.
 const shelved=projects.filter(p=>p.decision==='shelved').map(p=>projectCard(p,{now}));
 // Registered projects Joey rejected or removed: hidden from the board, restorable.
 const dismissed=projects.filter(p=>p.kind==='registered'&&['rejected','removed'].includes(p.decision)).map(p=>projectCard(p,{now}));
 projects=projects.filter(p=>p.decision!=='shelved'&&!(p.kind==='registered'&&['rejected','removed'].includes(p.decision)));
 const cards=projects.map(p=>projectCard(p,{runs:runsByProject[p.id]||null,handoff:handoffs[p.id]||null,review:reviews[p.id]||null,now}));
 const sorted=[...cards].sort((a,b)=>order.get(a.state)-order.get(b.state)||String(a.name).localeCompare(String(b.name)));
 const counts=Object.fromEntries(TOWER_STATES.map(s=>[s,0]));for(const c of cards)counts[c.state]++;
 return {shelved,dismissed,cards:sorted,attention:sorted.filter(c=>ATTENTION_STATES.has(c.state)),flying:sorted.filter(c=>!ATTENTION_STATES.has(c.state)),groups:GROUPS.map(([key,states])=>({key,cards:sorted.filter(c=>states.includes(c.state))})),counts,total:cards.length};
}
