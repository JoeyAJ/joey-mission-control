// Fixed approved historical stage comparison. No arbitrary repository/path API.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const exec=promisify(execFile),repo=fileURLToPath(new URL('../../../',import.meta.url));
export const stageRange=Object.freeze({from:'8b478f0d8c017defdd2a5f5dab92ea9972479c78',to:'91b171beddeddc2b69d26143fae5a2e4285f0539'});
const approvedFiles=['docs/COMMAND_WORKSPACE_CONTINUATION.md','docs/COMMAND_WORKSPACE_HANDOFF.md','docs/MC_COMMAND_CENTER_ACCEPTANCE.md','docs/MC_EXECUTION_REPORT_PROPOSAL.md','docs/MC_PHASE_PLAN.md','docs/MC_PRODUCER_CAPABILITY_AND_MINIMUM_APPROVAL.md','docs/contracts/candidate-observer.mjs','docs/contracts/consumer/private-preview.mjs','docs/contracts/observer-stdin.mjs','metadata/mc-phase-progress.json','public/app.js','public/command-workspace.js','public/styles.css','tests/browser/observer-qa.cjs','tests/candidate-observer.test.mjs','tests/startup-loading.test.mjs'];
const safePath=p=>approvedFiles.includes(p);
const bounded=text=>{const lines=text.split('\n'),cut=lines.slice(0,200).join('\n');let value=cut;while(Buffer.byteLength(value)>32768)value=value.slice(0,Math.floor(value.length*.9));return {text:value,truncated:value!==text};};
export async function readStageChanges({run=async args=>(await exec('git',args,{cwd:repo,maxBuffer:262144,timeout:5000,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}})).stdout,readAt}){
 if(!Number.isFinite(Date.parse(readAt)))throw Error('Invalid read time');
 const actual=(await run(['diff','--no-ext-diff','--no-textconv','--name-status',stageRange.from,stageRange.to,'--'])).trim().split('\n').filter(Boolean).map(line=>line.split('\t'));
 if(actual.length!==approvedFiles.length||new Set(actual.map(x=>x[1])).size!==approvedFiles.length||actual.some(x=>x.length!==2||!['A','M'].includes(x[0])||!safePath(x[1])))throw Error('Approved stage file set mismatch');
 const files=[];
 for(const [i,[status,file]]of actual.entries()){
  let diff,availability='AVAILABLE';try{diff=bounded(await run(['diff','--no-ext-diff','--no-textconv','--no-color','--unified=3',stageRange.from,stageRange.to,'--',file]));}catch{diff={text:null,truncated:false};availability='DIFF_UNAVAILABLE_OR_LIMIT_EXCEEDED';}
  files.push({id:'stage-file-'+String(i+1).padStart(3,'0'),path:file,status,availability,diff:diff.text,truncated:diff.truncated});
 }
 return {schemaVersion:'mc.stage-changes.v1',scope:'MISSION_CONTROL_CANDIDATE',kind:'HISTORICAL_GIT_COMPARISON_NOT_TOOL_EVENTS',range:stageRange,sourceTime:'2026-10-07T02:47:52Z',readAt,privateContent:true,currentActor:null,runtimeConnected:false,files};
}
