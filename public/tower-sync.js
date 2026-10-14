// Cloud sync for Control Tower records. Reads and writes go to this browser's storage
// first (works offline / signed out); while the Owner is signed in, each changed entry is
// pushed to the private cloud state, and the cloud copy replaces local copies on every sync.
export const SYNCED_KEYS=Object.freeze({'mc.tower.handoffs.v1':'handoffs','mc.tower.reviews.v1':'reviews','mc.tower.ideaDecisions.v1':'ideaDecisions'});
const MIGRATED_KEY='mc.tower.cloudMigrated.v1';
const parse=text=>{try{const v=JSON.parse(text||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function createTowerStore({local=globalThis.localStorage,push=async()=>{},isOnline=()=>false}={}){
 const queue=new Map();// "key\u0000id" -> {key,id,entry}
 const get=k=>{try{return local?.getItem(k)??null;}catch{return null;}};
 const set=(k,v)=>{try{local?.setItem(k,v);}catch{}};
 const enqueue=(key,id,entry)=>queue.set(key+'\u0000'+id,{key,id,entry:entry??null});
 async function flush(){
  if(!isOnline())return false;
  for(const [slot,item] of [...queue]){try{await push(item.key,item.id,item.entry);queue.delete(slot);}catch{return false;}}
  return true;
 }
 const storage={
  getItem:get,
  setItem(k,v){
   const cloudKey=SYNCED_KEYS[k],before=cloudKey?parse(get(k)):null;set(k,v);if(!cloudKey)return;
   const after=parse(v);for(const id of new Set([...Object.keys(before),...Object.keys(after)]))if(!same(before[id],after[id]))enqueue(cloudKey,id,after[id]);
   void flush();
  }
 };
 // First signed-in sync uploads records that existed before cloud sync; later syncs take
 // the cloud as the source of truth after pending local changes are pushed.
 async function sync(fetchState){
  if(!isOnline())return false;
  if(get(MIGRATED_KEY)!=='1'){for(const [k,key] of Object.entries(SYNCED_KEYS)){const map=parse(get(k));for(const [id,entry] of Object.entries(map))enqueue(key,id,entry);}}
  if(!await flush())return false;
  const state=await fetchState();if(!state)return false;
  set(MIGRATED_KEY,'1');
  let changed=false;
  for(const [k,key] of Object.entries(SYNCED_KEYS)){
   // Keep entries changed locally but not yet accepted by the cloud.
   const cloud={...(state[key]||{})};for(const item of queue.values())if(item.key===key){if(item.entry===null)delete cloud[item.id];else cloud[item.id]=item.entry;}
   if(!same(parse(get(k)),cloud)){set(k,JSON.stringify(cloud));changed=true;}
  }
  return changed;
 }
 return {storage,sync,flush,pending:()=>queue.size};
}
