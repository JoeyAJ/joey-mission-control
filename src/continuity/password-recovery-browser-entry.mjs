import {createClient} from '@supabase/supabase-js';
import {ownerAuthConfig} from '../../public/owner-auth-config.js';
import {ownerRecoveryConfig} from '../../public/owner-recovery-config.js';
import {createPasswordRecovery,createPasswordRecoveryRequest,passwordRecoveryPath} from './password-recovery.mjs';
import {mountPasswordRecovery} from './password-recovery-ui.mjs';

const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const locales=new Set(['zh-TW','en','ko']);
const savedLocale=()=>{try{return globalThis.localStorage?.getItem('mc-locale')||'zh-TW';}catch{return 'zh-TW';}};
export function mountPasswordRecoveryBrowser({doc=document,location=globalThis.location,history=globalThis.history,locale=savedLocale(),configuration=ownerRecoveryConfig}={}){
 const query=new URLSearchParams(location?.search||''),projectId=projects.has(query.get('project'))?query.get('project'):'NEXAEON';
 locale=locales.has(query.get('locale'))?query.get('locale'):locales.has(locale)?locale:'zh-TW';
 const returnTo='/#workspace?'+new URLSearchParams({project:projectId,module:'console',panel:'entries',owner:'signin'});
 let client;
 const policy={recoveryEnabled:configuration.callbackEnabled===true&&ownerAuthConfig.authSetupVerified===true&&ownerAuthConfig.sessionBridgeVerified===true,urlConfigurationVerified:configuration.urlConfigurationVerified===true,stageOrigin:ownerAuthConfig.stageOrigin,providerOrigin:ownerAuthConfig.origin,publishableKey:ownerAuthConfig.publishableKey,ownerSubject:ownerAuthConfig.ownerSubject,projectId,emailSendingApproved:false,passwordChangeApproved:configuration.passwordChangeApproved===true};
 const port=createPasswordRecovery({policy,location,history,createClient:(...args)=>{client=createClient(...args);return client;},verifyCurrentSession:async({projectId})=>{const response=await client.rpc('mc_owner_session',{project:projectId});if(response.error)throw Error('RECOVERY_SESSION_UNCONFIRMED');return response.data;}});
 const requestPort=createPasswordRecoveryRequest({policy:{...policy,emailSendingApproved:configuration.emailSendingApproved===true},location,createClient});
 if(doc.documentElement)doc.documentElement.lang=locale;
 return mountPasswordRecovery({doc,port,requestPort,locale,returnTo,onLocaleChange:next=>{locale=next;doc.documentElement.lang=next;try{globalThis.localStorage?.setItem('mc-locale',next);}catch{}}});
}
let active=null;
export function startPasswordRecoveryPage({doc=document,location=globalThis.location,history=globalThis.history}={}){
 const host=doc.getElementById('owner-recovery-root');if(!host||location?.pathname!==passwordRecoveryPath)return null;
 active?.dispose();active=mountPasswordRecoveryBrowser({doc,location,history});host.replaceChildren(active);return active;
}
if(typeof document!=='undefined'&&document.getElementById('owner-recovery-root')){
 startPasswordRecoveryPage();
 globalThis.addEventListener('pagehide',()=>{active?.dispose();active=null;});
 globalThis.addEventListener('pageshow',event=>{if(event.persisted)startPasswordRecoveryPage();});
}
