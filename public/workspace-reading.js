// One active project's transient UI geometry. Never stores content, forms or Auth state.
const states=new WeakMap();
const panes={projects:'.command-projects',events:'.command-events',explorer:'.command-layout>.command-explorer',mobileExplorer:'.command-explorer-mobile',inspector:'.command-inspector',graph:'.command-graph',changes:'.command-changes',fileTabs:'.command-file-tabs',observer:'.command-context>.command-observer'};
const controls=['data-command-project','data-command-event','data-explorer-item','data-mobile-explorer-item','data-explorer-compare','data-mobile-explorer-compare','data-graph-event','data-graph-file','data-graph-compare','data-graph-area','data-stage-file','data-inspector-tab','data-workspace-panel','data-command-refresh','data-command-filter','data-observer-event'];
const visible=node=>!!node&&node.getClientRects().length>0&&(!node.checkVisibility||node.checkVisibility({visibilityProperty:true}));
const bounded=value=>Number.isFinite(value)?Math.min(10000000,Math.max(0,value)):0;
function controlKey(root,node){
 if(!root?.contains(node)||node.closest('.command-owner-access,.owner-auth-entry'))return null;
 for(const attribute of controls)if(node.hasAttribute(attribute)){const value=node.getAttribute(attribute);if(value.length<=500)return{attribute,value,tagName:node.tagName};}
 return null;
}
function findControl(root,key){return key?[...root.querySelectorAll('['+key.attribute+']')].find(n=>n.tagName===key.tagName&&n.getAttribute(key.attribute)===key.value):null;}
function geometry(root,prior){
 const same=!!prior&&prior.project===root?.dataset.project,positions=same?{...prior.positions}:{};
 for(const [key,selector]of Object.entries(panes)){const node=root?.querySelector(selector);if(visible(node)&&(!same||prior.visiblePanes.includes(key)))positions[key]={top:bounded(node.scrollTop),left:bounded(node.scrollLeft)};}
 return positions;
}
const visiblePanes=root=>Object.entries(panes).filter(([,selector])=>visible(root.querySelector(selector))).map(([key])=>key);
export function rememberCommandWorkspace(holder){
 const root=holder?.querySelector('#command-workspace');if(!root)return;
 states.set(holder,{project:root.dataset.project,positions:geometry(root,states.get(holder)),visiblePanes:visiblePanes(root)});
}
export function replaceCommandWorkspace(holder,renderNext){
 const old=holder.querySelector('#command-workspace'),prior=states.get(holder);
 const project=old?.dataset.project,readingKey=old?.dataset.readingKey||'';
 const positions=geometry(old,prior);
 const focus=controlKey(old,holder.ownerDocument.activeElement);
 const sourceOpen=old?.querySelector('.command-source-details')?.open===true;
 const next=renderNext();holder.replaceChildren(next);
 const sameProject=next.dataset.project===project;
 const sameReading=sameProject&&(next.dataset.readingKey||'')===readingKey;
 const nextPositions=sameProject?positions:{};
 if(!sameReading){delete nextPositions.inspector;delete nextPositions.changes;}
 const proof=next.querySelector('.command-source-details');if(proof&&sameReading)proof.open=sourceOpen;
 for(const [key,selector]of Object.entries(panes)){const node=next.querySelector(selector),saved=nextPositions[key];if(node&&saved&&visible(node)){node.scrollTop=saved.top;node.scrollLeft=saved.left;}}
 const selectedTab=next.querySelector('.command-file-tabs [aria-pressed=true]');if(visible(selectedTab)){const n=selectedTab.getBoundingClientRect(),p=selectedTab.parentElement.getBoundingClientRect();if(n.right>p.right)selectedTab.parentElement.scrollLeft+=Math.ceil(n.right-p.right)+1;else if(n.left<p.left)selectedTab.parentElement.scrollLeft+=Math.floor(n.left-p.left)-1;}
 states.set(holder,{project:next.dataset.project,positions:nextPositions,visiblePanes:visiblePanes(next)});
 // Only continue an operation initiated inside this workspace, never steal outside/Auth focus.
 if(focus&&visible(next)){
  let target=findControl(next,focus);
  if(!visible(target)||target.disabled){
   const candidates=next.dataset.panel==='entries'?['.command-projects>h4']:next.dataset.panel==='events'?['.command-events>h4']:['.command-inspector h5','.command-changes','.command-explorer-mobile>h4','.command-graph'];
   target=candidates.map(s=>next.querySelector(s)).find(visible)||next;
   target.tabIndex=-1;
  }
  target.focus({preventScroll:true});
  // Graph-to-diff navigation shrinks this pane; keep its selected control in view.
  const graph=target.closest('.command-graph');
  if(graph&&graph!==target){const n=target.getBoundingClientRect(),p=graph.getBoundingClientRect();if(n.bottom>p.bottom)graph.scrollTop+=Math.ceil(n.bottom-p.bottom)+1;else if(n.top<p.top)graph.scrollTop+=Math.floor(n.top-p.top)-1;}
 }
 return next;
}
