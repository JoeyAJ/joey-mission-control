import test from 'node:test';import assert from 'node:assert/strict';
import {githubReadFailureKind,withGitHubReadDiagnostics} from '../src/reporting/github-read-diagnostic-server.mjs';
test('GitHub403 is classified only by safe evidence; missing headers cannot be called a permission failure',()=>{
 for(const [status,headers,expected] of [[403,{},'FORBIDDEN_UNCLASSIFIED'],[403,{'x-ratelimit-remaining':'0'},'PRIMARY_RATE_LIMIT'],[403,{'retry-after':'30'},'SECONDARY_RATE_LIMIT'],[429,{},'RATE_LIMIT'],[403,{'x-github-sso':'required; url=https://private.invalid'},'SSO_REQUIRED'],[403,{'x-ratelimit-remaining':'23'},'FORBIDDEN_UNCLASSIFIED'],[200,{},null],[401,{},null]])assert.equal(githubReadFailureKind(new Response('PRIVATE_BODY',{status,headers})),expected);
});
test('diagnostic wrapper preserves denial, performs exactly one request and logs no URL/body/identity/credential',async()=>{
 const lines=[];let calls=0;const response=new Response('PRIVATE_BODY',{status:403,headers:{'x-ratelimit-remaining':'0'}}),fetchImpl=async()=>{calls++;return response;};
 const wrapped=withGitHubReadDiagnostics(fetchImpl,'catalog',{log:value=>lines.push(value)});assert.equal(await wrapped('https://api.github.com/repos/PRIVATE/REPO',{headers:{Authorization:'Bearer PRIVATE_CREDENTIAL'}}),response);assert.equal(calls,1);assert.equal(response.bodyUsed,false);assert.deepEqual(lines,[{operation:'catalog',status:403,kind:'PRIMARY_RATE_LIMIT'}]);assert.doesNotMatch(JSON.stringify(lines),/PRIVATE|Bearer|https/);
 const brokenLog=withGitHubReadDiagnostics(fetchImpl,'repository-reports',{log:()=>{throw Error('log failure');}});assert.equal(await brokenLog('https://api.github.com/repos/PRIVATE/REPO'),response);
 await wrapped('https://api.github.com/repos/PRIVATE/REPO',{method:'POST'});assert.equal(lines.length,1);await wrapped('https://other.invalid/path');assert.equal(lines.length,1);
});
