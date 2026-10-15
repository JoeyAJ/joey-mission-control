// Control Tower model: reduces project records, Agent self-reports and local handoff
// intents to one plain status per project. It never infers that an Agent started from
// a copy click: a handoff stays "awaiting" until that Agent's own report arrives.
export const TOWER_STATES=['blocked','stale','review','decide','awaiting','running','approved','paused','idea','done','idle'];
export const ATTENTION_STATES=new Set(['blocked','stale','review','decide']);
export const AGENTS=[
 {id:'codex',name:'Codex',match:/codex/i},
 {id:'claude',name:'Claude Code',match:/claude/i},
 {id:'hermes',name:'Hermes',match:/hermes/i}
];
// Older handoff intents are dropped so a forgotten paste does not wait forever.
export const HANDOFF_TTL_MS=72*3600*1000;
export function agentKey(name){if(!name)return null;return AGENTS.find(a=>a.match.test(name))?.id||'other';}
export function agentName(key,fallback){return AGENTS.find(a=>a.id===key)?.name||fallback||key;}
const known=v=>typeof v==='string'&&v.trim()&&!/^unknown$/i.test(v.trim())?v.trim():null;
// Agents are asked to start featureTitle with the stage version ("v0.4 · goal").
export const versionOf=title=>/^\s*v(\d+(?:\.\d+){0,3}[A-Za-z0-9.-]*)\b/i.exec(title||'')?.[1]||null;
const time=v=>{const t=Date.parse(v);return Number.isFinite(t)?t:null;};
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
 const blocked=(runs?.blockers||[])[0]||null,stale=tasks.find(t=>t.currentState==='unconfirmed'&&['running','blocked'].includes(t.reportedState))||null;
 const history=tasks.map(t=>({agent:t.agentName,agentKey:agentKey(t.agentName),feature:t.featureTitle,state:t.currentState,at:t.eventAt}));
 const completed=!current&&latest?.currentState==='completed'?latest:null;
 // Last finished run Joey already reviewed; the card lets Joey revisit that decision.
 const reviewed=completed&&review&&completed.runId&&review.runId===completed.runId?{runId:completed.runId,decision:review.decision,agent:completed.agentName,feature:completed.featureTitle,summary:completed.summary,result:completed.result||null}:null;
 const base={id:project.id,name:project.name,kind:project.kind||'project',decision:project.decision||null,summary:project.summary||null,siteUrl:project.siteUrl||null,repositoryId:project.repositoryId||null,ref:project.ref||null,reviewed,version:versionOf(current?.featureTitle)||versionOf(latest?.featureTitle)||known(project.version),lifecycle,history,
  lastAgent:latest?.agentName||known(project.lastAgent)||null,
  updatedAt:latest?.eventAt||project.updatedAt||null,
  next:known(project.next)};
 // A handoff is settled once the receiving Agent reports after the copy time.
 let pending=null;const handoffAt=time(handoff?.at);
 if(handoff&&handoffAt&&now-handoffAt<HANDOFF_TTL_MS){const answered=tasks.some(t=>agentKey(t.agentName)===handoff.agent&&time(t.eventAt)>=handoffAt);if(!answered)pending={agent:handoff.agent,agentName:agentName(handoff.agent),goal:handoff.goal||'',at:handoff.at};}
 const card=(state,extra={})=>({...base,state,pending,...extra});
 if(blocked)return card('blocked',{agent:blocked.agentName,feature:blocked.featureTitle,summary:blocked.summary,at:blocked.eventAt});
 if(stale&&!current)return card('stale',{agent:stale.agentName,feature:stale.featureTitle,summary:stale.summary,at:stale.eventAt});
 if(pending)return card('awaiting',{agent:pending.agentName,feature:pending.goal,summary:null,at:pending.at,previousAgent:current?.agentName||base.lastAgent});
 // A finished run waits for Joey's review until Joey records a decision for that run.
 if(!current&&latest?.currentState==='completed'&&lifecycle==='active'&&review?.runId!==latest.runId)return card('review',{agent:latest.agentName,feature:latest.featureTitle,summary:latest.summary,at:latest.eventAt,runId:latest.runId,result:latest.result||null});
 if(current)return card('running',{agent:current.agentName,feature:current.featureTitle,summary:current.summary,at:current.eventAt});
 if(lifecycle==='idea')return card('decide',{agent:null,feature:null,summary:project.summary||null,at:base.updatedAt});
 if(lifecycle==='paused')return card('paused',{agent:null,feature:latest?.featureTitle||null,summary:latest?.summary||null,at:base.updatedAt});
 if(lifecycle==='done')return card('done',{agent:null,feature:latest?.featureTitle||null,summary:latest?.summary||null,at:base.updatedAt});
 // Joey approved the latest finished run; it stays approved until a newer run reports.
 if(reviewed?.decision==='accepted')return card('approved',{agent:null,feature:latest?.featureTitle||null,summary:latest?.summary||null,at:review.at||latest.eventAt});
 return card('idle',{agent:null,feature:latest?.featureTitle||null,summary:latest?.summary||null,at:base.updatedAt});
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
 return {shelved,dismissed,cards:sorted,attention:sorted.filter(c=>ATTENTION_STATES.has(c.state)),flying:sorted.filter(c=>!ATTENTION_STATES.has(c.state)),counts,total:cards.length};
}
