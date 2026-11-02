// Never turn failed/unauthenticated private reads into a silently empty catalog.
export async function readTowerCatalog(read,{timeoutMs=10000}={}){
 let timer;
 try{const projects=await Promise.race([Promise.resolve().then(read),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CATALOG_TIMEOUT')),timeoutMs);})]);return Array.isArray(projects)?{status:'ready',projects}:{status:'signin',projects:[]};}
 catch{return {status:'unavailable',projects:[]};}
 finally{clearTimeout(timer);}
}
export function towerCatalogState(catalog,{otherOwnerReady=false}={}){
 const ownerReady=otherOwnerReady||catalog.status==='ready';
 return {ownerReady,projects:ownerReady&&catalog.status==='ready'?catalog.projects:[],status:catalog.status};
}
export function catalogNotice(status,{guest=false,locale='en'}={}){
 const words={
  'zh-TW':{signin:'私人登記專案只在擁有者登入並完成驗證後顯示；目前清單不含私人專案。',unavailable:'私人專案清單未能載入，這不代表專案已刪除。請重新讀取；若仍無法載入，請重新確認擁有者登入與驗證。',retry:'重新讀取私人專案'},
  en:{signin:'Private registered projects appear after verified Owner sign-in. This view does not include private projects.',unavailable:'The private project catalog could not be loaded. This does not mean projects were deleted. Retry, then check Owner sign-in and verification if needed.',retry:'Retry private projects'},
  ko:{signin:'비공개 등록 프로젝트는 소유자 로그인 및 인증 후 표시됩니다. 현재 목록에는 비공개 프로젝트가 없습니다.',unavailable:'비공개 프로젝트 목록을 불러오지 못했습니다. 프로젝트가 삭제된 것은 아닙니다. 다시 읽고 필요하면 소유자 로그인과 인증을 확인하세요.',retry:'비공개 프로젝트 다시 읽기'}
 };
 const w=words[locale]||words.en;
 if(guest)return {message:w.signin,retry:null};
 return status==='ready'?null:{message:w.unavailable,retry:w.retry};
}
