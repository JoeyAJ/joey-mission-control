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
