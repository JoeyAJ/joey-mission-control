import test from 'node:test';import assert from 'node:assert/strict';
import {createRegistrationGitPort} from '../src/onboarding/project-registration-git.mjs';
import {createProjectRegistrationApplication} from '../src/onboarding/project-registration-application.mjs';
import {createProjectRegistrationClient} from '../src/onboarding/project-registration-client.mjs';
import {safeCatalogDiagnostic,readTowerCatalog,catalogNotice} from '../public/tower-catalog.js';
import {registrationTestActivation,REGISTRATION_TEST_OWNER} from './helpers/project-registration-git-fixture.mjs';
test('real Git transport HTTP failures survive server and client as safe numeric diagnostics, without source bytes',async()=>{
 for(const status of [401,403,404,429,503]){
  const port=createRegistrationGitPort({readCredential:'synthetic-private-token-123456789',ownerSubject:REGISTRATION_TEST_OWNER,activation:registrationTestActivation,fetchImpl:async()=>new Response('PRIVATE_RESPONSE_TOKEN_PATH',{status})});
  const app=createProjectRegistrationApplication({activation:registrationTestActivation,ownerSubject:REGISTRATION_TEST_OWNER,allowedOrigin:'https://synthetic.invalid',verifyOwner:async()=>({subject:REGISTRATION_TEST_OWNER,role:'OWNER',aal:'aal2',verified:true,sessionActive:true,expiresAt:Date.now()+60000}),gitPort:port});
  const client=createProjectRegistrationClient({origin:'https://synthetic.invalid',getAccessToken:async()=>'synthetic-owner-session-123456789',fetchImpl:async()=>{const r=await app.handle({method:'GET',headers:{authorization:'Bearer synthetic-owner-session-123456789'}},{action:'catalog'});assert.equal(r.status,503);return new Response(JSON.stringify(r.body),{status:r.status});}});
  const state=await readTowerCatalog(()=>client.catalog());assert.equal(state.status,'unavailable');assert.deepEqual(state.diagnostic,{code:'REGISTRATION_CATALOG_UNAVAILABLE',httpStatus:503,upstreamStatus:status});
  for(const locale of ['zh-TW','ko','en']){const owner=catalogNotice(state.status,{locale,diagnostic:state.diagnostic}),guest=catalogNotice(state.status,{guest:true,locale,diagnostic:state.diagnostic});assert.deepEqual(owner.diagnostic,state.diagnostic);assert.equal(guest.diagnostic,undefined);assert.doesNotMatch(JSON.stringify([owner,guest]),/PRIVATE_RESPONSE|synthetic-private-token|synthetic-owner-session|JoeyAJ/);}
 }
});
test('server Owner rejection remains distinguishable and performs zero Git reads',async()=>{
 let reads=0;const app=createProjectRegistrationApplication({activation:registrationTestActivation,ownerSubject:REGISTRATION_TEST_OWNER,verifyOwner:async()=>{throw Error('PRIVATE_AUTH_REASON');},gitPort:{readConfigured:true,readSnapshot:async()=>{reads++;}}});
 const reply=await app.handle({method:'GET',headers:{authorization:'Bearer synthetic-owner-session-123456789'}},{action:'catalog'});
 assert.equal(reply.status,403);assert.deepEqual(reply.body,{error:'OWNER_AUTHORIZATION_DENIED'});assert.equal(reads,0);
 assert.deepEqual(safeCatalogDiagnostic(Object.assign(Error('private'),{code:reply.body.error,status:reply.status})),{code:'OWNER_AUTHORIZATION_DENIED',httpStatus:403});
});
test('unrecognized exceptions and metadata are never rendered; timeout is explicitly identified',async()=>{
 assert.deepEqual(safeCatalogDiagnostic({code:'PRIVATE_TOKEN_VALUE',status:999,upstreamStatus:'403',url:'https://private.invalid'}),{code:'CATALOG_READ_UNAVAILABLE'});
 const state=await readTowerCatalog(()=>new Promise(()=>{}),{timeoutMs:2});assert.equal(state.diagnostic.code,'CATALOG_TIMEOUT');
});
