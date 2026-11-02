// Fixed public vocabulary only; never show raw exception messages, response bodies or URLs.
const diagnosticCodes=new Set(['CATALOG_TIMEOUT','OWNER_REQUIRED','OWNER_SESSION_UNAVAILABLE','OWNER_AUTHORIZATION_DENIED','OWNER_AUTHENTICATION_REQUIRED','REGISTRATION_NOT_ACTIVATED','REGISTRATION_CATALOG_UNAVAILABLE','REGISTRATION_CATALOG_INVALID','REGISTRATION_PRIVATE_IDENTITY_MISMATCH','REGISTRATION_REPLY_EXPIRED','REGISTRATION_REPLY_INVALID','REGISTRATION_GIT_ENTRY_INVALID','REGISTRATION_PRIVATE_READ_UNAVAILABLE','REGISTRATION_CATALOG_HEAD_CONFLICT','REGISTRATION_UNAVAILABLE','REGISTRATION_SCOPE_DENIED']);
export function safeCatalogDiagnostic(error){
 const raw=error?.code||error?.message,code=diagnosticCodes.has(raw)?raw:'CATALOG_READ_UNAVAILABLE';
 return {code,...([400,401,403,404,409,413,429,500,502,503,504].includes((error?.status??error?.httpStatus))?{httpStatus:error.status??error.httpStatus}:{}),...([401,403,404,429,500,502,503,504].includes(error?.upstreamStatus)?{upstreamStatus:error.upstreamStatus}:{})};
}
// Never turn failed/unauthenticated private reads into a silently empty catalog.
export async function readTowerCatalog(read,{timeoutMs=10000}={}){
 let timer;
 try{const projects=await Promise.race([Promise.resolve().then(read),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CATALOG_TIMEOUT')),timeoutMs);})]);return Array.isArray(projects)?{status:'ready',projects}:{status:'signin',projects:[]};}
 catch(error){return {status:'unavailable',projects:[],diagnostic:safeCatalogDiagnostic(error)};}
 finally{clearTimeout(timer);}
}
export function towerCatalogState(catalog,{otherOwnerReady=false}={}){
 const ownerReady=otherOwnerReady||catalog.status==='ready';
 return {ownerReady,projects:ownerReady&&catalog.status==='ready'?catalog.projects:[],status:catalog.status,diagnostic:catalog.diagnostic?safeCatalogDiagnostic({...catalog.diagnostic,code:catalog.diagnostic.code,status:catalog.diagnostic.httpStatus}):null};
}
export function catalogNotice(status,{guest=false,locale='en',diagnostic=null}={}){
 const words={
  'zh-TW':{signin:'私人登記專案只在擁有者登入並完成驗證後顯示；目前清單不含私人專案。',unavailable:'私人專案清單未能載入，這不代表專案已刪除。請重新讀取；若仍失敗，請提供下方診斷碼以便查明原因。',retry:'重新讀取私人專案'},
  en:{signin:'Private registered projects appear after verified Owner sign-in. This view does not include private projects.',unavailable:'The private project catalog could not be loaded. This does not mean projects were deleted. Retry; if it still fails, share the diagnostic code below so we can investigate.',retry:'Retry private projects'},
  ko:{signin:'비공개 등록 프로젝트는 소유자 로그인 및 인증 후 표시됩니다. 현재 목록에는 비공개 프로젝트가 없습니다.',unavailable:'비공개 프로젝트 목록을 불러오지 못했습니다. 프로젝트가 삭제된 것은 아닙니다. 다시 읽고 계속 실패하면 아래 진단 코드를 알려 주세요.',retry:'비공개 프로젝트 다시 읽기'}
 };
 const w=words[locale]||words.en;
 if(guest)return {message:w.signin,retry:null};
 return status==='ready'?null:{message:w.unavailable,retry:w.retry,diagnostic:safeCatalogDiagnostic(diagnostic||{code:status==='signin'?'OWNER_REQUIRED':null})};
}
