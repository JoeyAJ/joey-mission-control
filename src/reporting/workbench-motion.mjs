// Transient presentation over the existing validated selection. No storage or transport.
export const workbenchSelectionKey=s=>JSON.stringify([s.runId,s.selected,s.selectedFilePath]);
export function freshWorkbenchMotionKeys(projection,keys,now){
 const fresh=new Set(projection.runs.filter(r=>r.presentation.freshness==='FRESH').map(r=>r.report.runId));
 return projection.events.filter(r=>keys.includes(r.key)&&fresh.has(r.runId)&&[r.event.eventAt,...(r.event.activity?[r.event.activity.observedAt]:[])].every(at=>{const age=now-Date.parse(at);return age>=0&&age<300000;})).map(r=>r.key);
}

export function createWorkbenchPaneMotion({requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),now=Date.now}={}){
 let previous=null,requested=null,intent=null,frame=null,generation=0,query=null,lease=null;
 const animations=new Set(),nodes=new Set();
 const removeMark=n=>{delete n.dataset.workbenchMotion;delete n.dataset.workbenchMotionBinding;};
 function cancel(){generation++;if(frame!==null)cancelFrame?.(frame);frame=null;for(const a of animations)a.cancel();animations.clear();for(const n of nodes)removeMark(n);nodes.clear();}
 const reduced=()=>query?.matches===true;
 const changed=()=>{if(reduced()){previous=requested;cancel();}};
 const api={
  connect(next,mount){lease=mount;if(query===next)return;query?.removeEventListener?.('change',changed);query=next;query?.addEventListener?.('change',changed);},
  request(binding){cancel();intent=binding===previous?null:{binding,at:now()};},
  apply({binding,panes,eligible=true,current=()=>true,kind='selection'}){
   cancel();requested=eligible?binding:null;
   const selected=intent?.binding===binding&&now()-intent.at<2000;
   if(!eligible){previous=null;intent=null;return;}
   if((previous===null&&kind!=='report'&&!selected)||previous===binding||reduced()||!requestFrame){previous=binding;intent=null;return;}
   const ticket=generation;
   frame=requestFrame(()=>{
    if(ticket!==generation)return;frame=null;
    if(!current()){previous=requested=intent=null;return;}
    previous=binding;intent=null;if(reduced())return;
    // Fade in only the newly rendered facts. Never retain an old-content snapshot.
    for(const n of panes){if(!n.isConnected||!n.getClientRects().length||!n.animate)continue;
     n.dataset.workbenchMotion=kind;n.dataset.workbenchMotionBinding=binding;nodes.add(n);
     const a=n.animate([{opacity:.88,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});animations.add(a);
     const finish=()=>{animations.delete(a);if(ticket===generation){removeMark(n);nodes.delete(n);}};
     a.finished.then(finish,finish);
    }
   });
  },
  pause(){cancel();previous=requested=null;},
  reset(){cancel();previous=requested=intent=null;},
  // Workspace replacement mounts the next view before disposing its predecessor.
  disconnect(mount){if(mount!==undefined&&mount!==lease)return;cancel();query?.removeEventListener?.('change',changed);query=null;lease=null;}
 };
 return api;
}
