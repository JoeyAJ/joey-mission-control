import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {writeFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {webcrypto,createHash} from 'node:crypto';
import {createOwnerVmLink} from '../../../../src/continuity/owner-vm-link.mjs';
import {vmBootstrapCommand} from '../../../../src/continuity/owner-vm-link-command.mjs';
test('generated command, prepared approval, clipboard paste and Enter work in a real local interactive PTY',async()=>{
 const config={enabled:true,projectId:'NEXAEON',policyDigest:'a'.repeat(64),artifactDigest:'b'.repeat(64)};let approved,view={enabled:true,release:'0.1.1',...config,worker:null,jobs:[]};
 const ui=createOwnerVmLink({config,cryptoImpl:webcrypto,inspectSession:async()=>({status:'authenticated',verified:true,aal:'aal2',memberActive:true}),rpc:async r=>{
  if(r.action==='approve_pair'){approved=r.body;view={...view,worker:{workerId:r.body.workerId,enabled:false,revoked:false,paired:false,keyDigest:null},jobs:[{jobId:'synthetic_job',attemptId:'synthetic_attempt',workerId:r.body.workerId,fence:1,task:'SMOKE_CONNECTION_V1',claimed:false,spawnIntent:false,cancel:false,terminal:false,outcome:null,events:[]}]};return {workerId:r.body.workerId,jobId:'synthetic_job',...config,pairingUntil:Date.now()+600000};}return structuredClone(view);
 }});
 await ui.refresh();const workerId=ui.prepareTerminal(),command=vmBootstrapCommand(workerId);ui.confirmTerminalReady({explicit:true});await ui.approvePair();const code=ui.snapshot().pairingCode;
 assert.equal(approved.workerId,workerId);assert.equal(approved.pairingHash,createHash('sha256').update(code).digest('hex'));assert(!command.includes(code));
 const repo=fileURLToPath(new URL('../../../../',import.meta.url));
 const r=spawnSync('/usr/bin/python3',[fileURLToPath(new URL('../integration/terminal-pty.py',import.meta.url))],{input:JSON.stringify({repo,workerId,command,code,hash:approved.pairingHash}),encoding:'utf8',timeout:30000,maxBuffer:64000});ui.dispose();
 assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);
 for(const c of report.cases){assert(c.commandPastedToInteractiveShell,c.case);assert.equal(c.secretEchoed,false,c.case);
  if(c.case.startsWith('preflight-')){assert.equal(c.promptReached,false,c.case);assert.equal(c.preflightPassed,false,c.case);assert.equal(c.blockedCode,'PILOT_PREFLIGHT_BLOCKED',c.case);assert.equal(c.localFetchCalls,0,c.case);assert(c.preflightBlockers.includes(c.case==='preflight-sudo-denied'?'passwordless_exact_service_permission':c.case==='preflight-unsafe-directory'?'directory_guards':'fresh_installation'),c.case);}
  else{assert(c.promptReached&&c.preflightPassed,c.case);assert.equal(c.blockedCode,c.case==='control-C'?'USER_CANCELLED':'BROKER_HTTP_503',c.case);assert.equal(c.localFetchCalls,c.case==='control-C'?0:1,c.case);for(const x of c.checks)assert(Object.values(x).every(Boolean),c.case);}}
 assert(report.cases.find(x=>x.case==='blank-then-valid').blankReprompt);assert(report.cases.find(x=>x.case==='malformed-then-valid').malformedReprompt);assert.equal(report.networkCalls,0);
 if(process.env.MC_TERMINAL_PTY_REPORT)writeFileSync(process.env.MC_TERMINAL_PTY_REPORT,JSON.stringify({...report,preparedEqualsApproved:true,generationHashMatches:true,secretInCommand:false,syntheticOnly:true},null,2)+'\n');
});
