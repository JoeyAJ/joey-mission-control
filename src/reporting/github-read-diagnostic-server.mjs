// Fixed server-only diagnostics. Never log URLs, repository/account identity,
// response bodies, request headers, credentials or provider error messages.
export function githubReadFailureKind(response){
 if(response.status!==403&&response.status!==429)return null;
 if(response.headers?.get('x-ratelimit-remaining')==='0')return 'PRIMARY_RATE_LIMIT';
 if(/^\d+$/.test(response.headers?.get('retry-after')||''))return 'SECONDARY_RATE_LIMIT';
 if(response.status===429)return 'RATE_LIMIT';
 if(response.headers?.get('x-github-sso')?.startsWith('required;'))return 'SSO_REQUIRED';
 return 'FORBIDDEN_UNCLASSIFIED';
}
export function withGitHubReadDiagnostics(fetchImpl,operation,{log=value=>console.warn('MC_GITHUB_READ_DIAGNOSTIC',JSON.stringify(value))}={}){
 if(!['catalog','repository-reports'].includes(operation))throw Error('DIAGNOSTIC_OPERATION_INVALID');
 return async(url,options)=>{const response=await fetchImpl(url,options);const kind=githubReadFailureKind(response);if(kind&&(options?.method||'GET')==='GET'&&new URL(url).origin==='https://api.github.com'){try{log({operation,status:response.status,kind});}catch{/* Diagnostics never change provider behavior. */}}return response;};
}
