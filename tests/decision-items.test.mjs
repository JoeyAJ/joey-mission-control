import {canonicalRoot} from './helpers/fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedDecisionItems} from '../public/control-semantics.js';
import {attentionItems,controlFlags} from '../public/presentation.js';
import {decisionButton,decisionPanel} from '../public/decision-view.js';
import {buildProjection} from '../src/projection/projection-service.mjs';
const source={classification:'canonical',sourcePath:'/fixture/NEXT_ACTIONS.md',sourceSection:'Decisions Needed From Joey',fingerprint:'a'.repeat(64),verificationStatus:'documented',readAt:'2026-10-05T00:00:00Z'};
const claim=value=>({value,classification:'canonical',source});
const p=value=>({id:'TEST',name:{value:'Test project'},management:{decisions:[claim(value)],approvals:[]},workspaceObservation:{observedAt:new Date().toISOString()},sourceFingerprints:[{}]});
const valid='WHAT: Choose school SSO or email OTP | WHY: Login needs a verified student identity provider | STATUS: pending';
function documentStub(){return{createElement(tag){return{tag,children:[],dataset:{},listeners:{},focus(){this.focused=true},append(...children){this.children.push(...children)},addEventListener(event,callback){this.listeners[event]=callback},setAttribute(key,value){this[key]=value}}}};}
const texts=node=>[node.textContent||'',...(node.children||[]).flatMap(texts)].join('\n');
test('generic text and incomplete/unverified decision records cannot create badges or counts',()=>{
 for(const value of ['Joey approval required','authorization required','decision required','Unknown','尚無已校對摘要；請展開來源查看','WHAT: Choose provider | STATUS: pending','WHAT: Joey approval | WHY: authorization required | STATUS: pending',valid.replace('pending','resolved'),valid+' | STATUS: resolved',valid+' | STATUS:',valid+' | WHAT:',valid+' | WHY:','WHAT: Users choose dark mode in the application | WHY: The application has a dark mode setting | STATUS: pending',valid+' | WHAT: Choose another provider',valid+' | WHY: Another conflicting reason','WHAT: The application uses TypeScript | WHY: The repository contains TypeScript source files | STATUS: pending']){assert.equal(verifiedDecisionItems(p(value)).length,0,value);assert.equal(controlFlags(p(value)).decision,false);assert.equal(attentionItems(p(value)).filter(x=>x.type==='decision').length,0);}
 const unverified=p(valid);unverified.management.decisions[0].source={...source,verificationStatus:'unverified'};assert.equal(verifiedDecisionItems(unverified).length,0);
});
test('verified WHAT WHY SOURCE pending STATUS resolves through clickable indicator to exact target',()=>{
 const project=p(valid),items=verifiedDecisionItems(project);assert.equal(items.length,1);const item=items[0];assert.equal(item.what,'Choose school SSO or email OTP');assert.equal(item.why,'Login needs a verified student identity provider');assert.equal(item.status,'pending');assert.equal(item.source.sourcePath,source.sourcePath);
 assert.equal(controlFlags(project).decision,true);assert.equal(attentionItems(project).find(x=>x.type==='decision').decision.id,item.id);
 let opened;const doc=documentStub(),button=decisionButton(project,item,(_,decision)=>{opened=decision},doc,'zh-TW');assert.equal(button.tag,'button');assert.match(button.textContent,/等待 Joey 決策/);button.listeners.click();assert.equal(opened.id,item.id);
 const panel=decisionPanel(project,opened,doc,'zh-TW');const statusButton=panel.children.find(n=>n.children?.some(c=>c.dataset?.decisionTarget))?.children.find(c=>c.dataset?.decisionTarget);assert.equal(statusButton.dataset.decisionTarget,item.id);statusButton.listeners.click();assert.equal(panel.focused,true);assert.equal(panel.id,button.dataset.decisionTarget);const text=texts(panel);for(const expected of ['Test project',item.what,item.why,source.sourcePath,'查看證據／來源'])assert.ok(text.includes(expected),expected);
});
test('current canonical candidates without explicit WHY/status are preserved but not actionable',async()=>{
 const snapshot=await buildProjection(canonicalRoot);for(const project of snapshot.projects){assert.equal(verifiedDecisionItems(project).length,0,project.id);assert.ok(Array.isArray(project.management.decisions));assert.equal(controlFlags(project).decision,false);}
});
