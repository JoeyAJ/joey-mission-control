import test from 'node:test';import assert from 'node:assert/strict';
import {registrationGitFixture,REGISTRATION_TEST_OWNER,registrationTestActivation} from './helpers/project-registration-git-fixture.mjs';
import {createProjectRegistrationApplication} from '../src/onboarding/project-registration-application.mjs';
const catalogRequest={method:'GET',headers:{authorization:'Bearer synthetic-owner-session-123456789'}};
const application=(f,verifyOwner=async()=>f.state.actor)=>createProjectRegistrationApplication({activation:registrationTestActivation,ownerSubject:REGISTRATION_TEST_OWNER,verifyOwner,gitPort:f.port,now:()=>f.state.clock});
test('production-shaped public MC host passes catalog read; unexpected private-host metadata is rejected with exact 409',async()=>{
 const f=await registrationGitFixture();try{
  const a=application(f);assert.equal((await a.handle(catalogRequest,{action:'catalog'})).status,200);
  f.state.mutate=(url,data)=>{if(url.pathname==='/repos/JoeyAJ/joey-mission-control'){data.private=true;data.visibility='private';}};
  const mismatch=await a.handle(catalogRequest,{action:'catalog'});assert.equal(mismatch.status,409);assert.equal(mismatch.body.error,'REGISTRATION_PRIVATE_IDENTITY_MISMATCH');
 }finally{await f.cleanup();}
});
test('catalog host identity remains fail-closed for foreign IDs/names, missing flags and inconsistent visibility',async()=>{
 const f=await registrationGitFixture();try{
  for(const change of [d=>d.id++,d=>d.full_name='Foreign/catalog',d=>d.private=true,d=>d.visibility='private',d=>d.archived=true,d=>d.disabled=true,d=>delete d.private,d=>delete d.visibility,d=>delete d.archived,d=>delete d.disabled]){
   let contentReads=0;f.state.mutate=(url,data)=>{if(url.pathname==='/repos/JoeyAJ/joey-mission-control')change(data);if(url.pathname.includes('/contents/'))contentReads++;};
   const r=await application(f).handle(catalogRequest,{action:'catalog'});assert.equal(r.status,409);assert.equal(r.body.error,'REGISTRATION_PRIVATE_IDENTITY_MISMATCH');assert.equal(contentReads,0);
  }
 }finally{await f.cleanup();}
});
test('public catalog host does not authorize a non-Owner or relax PRIVATE imported project identity',async()=>{
 const f=await registrationGitFixture();try{
  let identities=0;f.state.mutate=url=>{if(url.pathname==='/repos/JoeyAJ/joey-mission-control')identities++;};
  const denied=await application(f,async()=>({...f.state.actor,role:'GUEST'})).handle(catalogRequest,{action:'catalog'});assert.equal(denied.status,403);assert.equal(identities,0);
  const original=f.sourceReader.inspectIdentity;f.sourceReader.inspectIdentity=async()=>({...await original(),private:false,visibility:'public'});
  const r=await f.server().handle(f.req);assert.equal(r.status,409);assert.equal(r.body.error,'REGISTRATION_PRIVATE_IDENTITY_MISMATCH');assert.equal(f.state.commits,0);
 }finally{await f.cleanup();}
});
