// Scope-local UI state over already validated v1 events. No new transport/schema.
export function createActivityFollow(){let runId=null,selected=null,following=true,filePath=null;const unread=new Map();
 const latest=(events,id)=>events.filter(e=>e.runId===id).sort((a,b)=>a.event.sequence-b.event.sequence).at(-1);
 return{
  observe(projection,newKeys=[]){const events=projection.events||[];if(!events.length)return this.snapshot(events);
   if(runId===null){runId=events.at(-1).runId;following=true;selected=latest(events,runId).key;}
   for(const e of events)if(newKeys.includes(e.key)&&(e.runId!==runId||!following)){if(!unread.has(e.runId))unread.set(e.runId,new Set());unread.get(e.runId).add(e.key);}
   if(!latest(events,runId)){selected=null;filePath=null;}else if(following){selected=latest(events,runId).key;filePath=null;unread.delete(runId);}else if(filePath===null&&!events.some(e=>e.key===selected))selected=latest(events,runId).key;
   return this.snapshot(events);
  },
  selectRun(id,events){if(!latest(events,id))return;runId=id;following=true;filePath=null;selected=latest(events,id).key;unread.delete(id);},
  selectEvent(key,events){const e=events.find(e=>e.key===key);if(!e)return;runId=e.runId;selected=key;following=false;filePath=null;unread.get(runId)?.delete(key);},
  selectFile(path,events,manifest){if(!manifest?.includes(path)||!latest(events,runId))return;filePath=path;following=false;selected=events.filter(e=>e.runId===runId&&e.event.activity?.path===path).sort((a,b)=>a.event.sequence-b.event.sequence).at(-1)?.key||null;unread.get(runId)?.delete(selected);},
  pause(){following=false;},resume(events){if(!latest(events,runId))return;following=true;filePath=null;selected=latest(events,runId).key;unread.delete(runId);},
  reset(){runId=selected=filePath=null;following=true;unread.clear();},
  snapshot(events=[]){const visibleEvents=events.filter(e=>e.runId===runId),selectedFilePath=filePath||visibleEvents.find(e=>e.key===selected)?.event.activity?.path||null;return{runId,selected,following,selectedFilePath,fileSelection:filePath!==null,unread:Object.fromEntries([...unread].map(([id,keys])=>[id,keys.size])),visibleEvents};},
 };
}
