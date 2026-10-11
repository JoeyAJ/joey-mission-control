import {t,getLocale} from './i18n.js';
export function safeProjectUrl(raw){
 if(typeof raw!=='string'||raw.trim()!==raw||/[\s\u0000-\u001f\u007f\\]/.test(raw))return false;
 try{const url=new URL(raw);return url.protocol==='https:'&&Boolean(url.hostname)&&!url.username&&!url.password;}catch{return false;}
}
export function primaryProjectLink(project){
 const entries=project.projectUrls?.entries||[];
 return ['canonical_production','current_application'].map(type=>entries.find(entry=>entry.type===type&&entry.urlVerification==='joey_confirmed'&&safeProjectUrl(entry.url))).find(Boolean)||null;
}
export function createProjectLink(entry,doc=document,locale=getLocale()){
 if(!entry||entry.urlVerification!=='joey_confirmed'||!safeProjectUrl(entry.url)||!['canonical_production','current_application'].includes(entry.type))return null;
 const anchor=doc.createElement('a');anchor.href=entry.url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.className='project-link selectable';anchor.textContent='↗ '+t(entry.type==='canonical_production'?'url.openProduction':'url.openCurrent',{},locale);return anchor;
}

// Exact Joey-confirmed metadata mappings. URL confirmation is not build/acceptance proof.
const confirmedSites={NEXAEON:'https://nexaeon-web.vercel.app/',WOOSONG_BUDDY:'https://woosong-buddy-app.vercel.app/',NAMYOUNG_WEB3D:'https://namyoung-web3d.vercel.app/',JOEY_ASSET_SYSTEM:'https://namyoung-asset-lab.joeyaj.chatgpt.site/'};
const universityDemo='https://joey-woosong-admissions-demo.vercel.app/';
export function selectedProjectSite({projectId,track='BASELINE',projects=[],publicCases=null}={}){
 if(track==='UNIVERSITY_CANDIDATE'){
  if(projectId!=='JOEY_ASSET_SYSTEM'||publicCases?.schemaVersion!=='public-child-cases.v1'||publicCases?.syncMode!=='manually_verified_public_release_snapshot'||!Array.isArray(publicCases.cases))return null;
  const cases=publicCases.cases?.filter(c=>c?.id==='CASE_002_UNIVERSITY');if(cases?.length!==1)return null;const c=cases[0];
  return c.parentProjectId==='JOEY_ASSET_SYSTEM'&&c.institutionId==='WOOSONG_UNIVERSITY'&&c.assetId==='education.university_lifecycle'&&c.publicURL===universityDemo&&c.officialService===false&&c.joeyAcceptance==='PENDING_RETEST'&&c.source?.kind==='verified_public_demo_and_owner_confirmed_classification'&&c.source.releaseURL===universityDemo+'release.json'&&/^dpl_[A-Za-z0-9]+$/.test(c.source.deploymentId)&&Number.isFinite(Date.parse(c.source.verifiedAt))?{url:universityDemo,type:'candidate_demo'}:null;
 }
 if(track!=='BASELINE'||!Object.hasOwn(confirmedSites,projectId)||!Array.isArray(projects))return null;
 const records=projects.filter(p=>p?.id===projectId);if(records.length!==1)return null;const project=records[0];if(!Array.isArray(project.projectUrls?.entries)||project.projectUrls.entries.some(e=>!e||typeof e!=='object'))return null;const entry=primaryProjectLink(project);
 if(!entry||entry.url!==confirmedSites[projectId]||project.projectUrls?.source?.verificationStatus!=='joey_confirmed_url'||project.projectUrls.source.authority!=='joey_confirmed_project_metadata')return null;
 const current=projectId==='JOEY_ASSET_SYSTEM';if(entry.type!==(current?'current_application':'canonical_production')||entry.status!==(current?'active_legacy_named':'active')||!current&&project.where?.production?.value!==entry.url)return null;
 return{url:entry.url,type:entry.type};
}
export function createJoeySiteNavigation(input,doc=document,locale=getLocale()){
 const words=locale==='ko'?['프로젝트 목록','웹사이트 미확인','이 범위에 확인된 웹사이트 URL이 없습니다.','University 공개 테스트 열기','University 후보 · Joey 검수 대기']:locale==='en'?['Project list','Website unavailable','No confirmed website URL for this scope.','Open University public test','University candidate · Joey acceptance pending']:['專案列表','網站未確認','此範圍尚無已確認的網站網址。','開啟 University 公開測試','University 候選 · Joey 驗收待確認'];
 const root=doc.createElement('nav'),site=selectedProjectSite(input),list=doc.createElement('a');root.className='joey-site-navigation';root.dataset.joeySiteScope=JSON.stringify([input.projectId,input.track]);root.setAttribute('aria-label',words[0]);
 if(site){const a=doc.createElement('a');a.href=site.url;a.target='_blank';a.rel='noopener noreferrer';a.dataset.joeyPublicSite=site.type;a.textContent='↗ '+(site.type==='candidate_demo'?words[3]:t(site.type==='canonical_production'?'url.openProduction':'url.openCurrent',{},locale));root.append(a);if(site.type==='candidate_demo'){const note=doc.createElement('small');note.textContent=words[4];root.append(note);}}
 else{const button=doc.createElement('button'),reason=doc.createElement('small');button.type='button';button.disabled=true;button.dataset.joeyPublicSite='unavailable';button.textContent=words[1];reason.textContent=words[2];root.append(button,reason);}
 list.href='#dashboard';list.dataset.joeyProjectList='true';list.textContent=words[0];root.append(list);return root;
}
