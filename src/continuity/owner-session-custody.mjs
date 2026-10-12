import {navigatorLock} from '@supabase/auth-js';
// Nonsecret generation fence for existing SDK custody. Never a grant or credential.
export const ownerSessionStorageKey='mc-owner-session-v1';
export const ownerSessionGenerationKey='mc-owner-session-generation-v1';
export const ownerSessionLockName='lock:'+ownerSessionStorageKey;
export function ownerSessionLock(operation,timeout=10000){const locks=globalThis.navigator?.locks;if(typeof locks?.request!=='function')throw Error('SESSION_UNCONFIRMED');return navigatorLock(ownerSessionLockName,timeout,operation);}
export function createOwnerSessionCustody(storage=globalThis.localStorage){
 const read=key=>{const value=storage.getItem(key);if(value!==null&&typeof value!=='string')throw Error('SESSION_UNCONFIRMED');return value;};
 const bump=()=>storage.setItem(ownerSessionGenerationKey,globalThis.crypto.randomUUID());
 const adapter=Object.freeze({getItem:read,setItem(key,value){if(key===ownerSessionStorageKey)bump();return storage.setItem(key,value);},removeItem(key){if(key===ownerSessionStorageKey)bump();return storage.removeItem(key);}});
 return Object.freeze({storage:adapter,snapshot:()=>({session:read(ownerSessionStorageKey),generation:read(ownerSessionGenerationKey)}),unchanged:s=>read(ownerSessionGenerationKey)===s.generation&&read(ownerSessionStorageKey)===s.session,commit:(serialized)=>adapter.setItem(ownerSessionStorageKey,serialized)});
}
export function withOwnerSessionCustody(options){
 if(options?.auth?.persistSession!==true||options.auth.storageKey!==ownerSessionStorageKey)return options;
 let storage;try{storage=options.auth.storage||globalThis.localStorage;if(!storage)return options;}catch{return options;}
 const custody=createOwnerSessionCustody(storage),locks=globalThis.navigator?.locks;
 return {...options,auth:{...options.auth,storage:custody.storage,...(typeof locks?.request==='function'?{lock:(name,timeout,operation)=>{if(name!==ownerSessionLockName)throw Error('SESSION_UNCONFIRMED');return ownerSessionLock(operation,timeout);}}:{})}};
}
