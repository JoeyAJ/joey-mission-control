// Process-local capability, never accepted from JSON, registration, or HTTP input.
// Only a trusted server composition may supply the live assert function.
const authorities=new WeakMap();
export function createProjectScopeAuthority(assert){
 if(typeof assert!=='function')throw Error('PROJECT_SCOPE_DENIED');
 const authority=Object.freeze({});authorities.set(authority,assert);return authority;
}
export function assertProjectScope(authority,projectId,track,operation){
 const assert=authority&&authorities.get(authority);if(!assert)throw Error('PROJECT_SCOPE_DENIED');
 return structuredClone(assert({projectId,track,operation}));
}
