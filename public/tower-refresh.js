// Control Tower refresh loop. The first Owner read starts at once and the board stays in a
// loading state until it settles (or the read reports Owner data unavailable), so the bundled
// snapshot and this browser's older handoff records are never shown as current progress.
// If the first read is slow, the board appears with a clear "may be out of date" notice.
export const FIRST_READ_SLOW_MS=15000,SIGNED_IN_MS=30000,SIGNED_OUT_MS=5000;
export function createTowerRefresh({read,render,canRefresh=()=>true,setTimer=setTimeout,clearTimer=clearTimeout,slowMs=FIRST_READ_SLOW_MS}={}){
 // phase: 'loading' (nothing settled yet) → 'slow' (first read still running past slowMs) → 'ready'.
 let phase='loading',timer=null,slowTimer=null,inFlight=false,ready=false;
 async function tick(){
  timer=null;
  if(phase==='ready'&&!canRefresh()){schedule();return;}
  inFlight=true;let result=null;
  try{result=await read();}catch{result=null;}finally{inFlight=false;}
  ready=!!result?.ready;
  const first=phase!=='ready';
  if(first){phase='ready';if(slowTimer!==null){clearTimer(slowTimer);slowTimer=null;}}
  if(first||result?.changed)render();else schedule();
 }
 function schedule(){
  if(timer!==null){clearTimer(timer);timer=null;}
  if(inFlight)return;
  timer=setTimer(tick,phase==='ready'?(ready?SIGNED_IN_MS:SIGNED_OUT_MS):0);
  if(phase==='loading'&&slowTimer===null)slowTimer=setTimer(()=>{slowTimer=null;if(phase==='loading'){phase='slow';render();}},slowMs);
 }
 return {schedule,get phase(){return phase;}};
}
