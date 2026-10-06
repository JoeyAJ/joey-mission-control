import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {renderJoeyView,renderCommandReadouts,humanWords} from '../public/joey-view.js';
import {createCockpitComponents} from '../public/joey-cockpit.js';
const baseline=JSON.parse(await fs.readFile(new URL('../deployment/production-snapshot.json',import.meta.url)));
import {productView} from '../src/product/view.mjs';
const projects=baseline.projects.map(p=>({project_id:p.id,product:productView(p)}));
function dom(){return{createElement(tag){return{tag,children:[],dataset:{},attrs:{},events:{},style:{setProperty(){}},append(...nodes){this.children.push(...nodes);},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.events[k]=v;},focus(){this.focused=true;}};}};}
function all(node,predicate){return[predicate(node)?node:null,...(node.children||[]).flatMap(n=>all(n,predicate))].filter(Boolean);}
const byClass=(root,name)=>all(root,n=>n.className?.split(' ').includes(name));
function frozen(v){Object.freeze(v);for(const child of Object.values(v))if(child&&typeof child==='object'&&!Object.isFrozen(child))frozen(child);return v;}
test('cockpit components consume current data without changing purpose, milestones, evidence or progress',()=>{
 const input=frozen(structuredClone(projects)),before=JSON.stringify(input),root=renderJoeyView(input,{doc:dom(),locale:'zh-TW'});assert.equal(JSON.stringify(input),before);assert.equal(byClass(root,'cockpit-card').length,4);assert.equal(byClass(root,'cockpit-card').filter(p=>!p.hidden).length,1);assert.equal(root.dataset.selectedProject,'NEXAEON');assert.equal(byClass(root,'position-panel').length,4);assert.equal(byClass(root,'next-panel').length,4);assert.equal(byClass(root,'blueprint-instrument').length,4);assert.equal(byClass(root,'track-milestone').length,0);assert.equal(all(root,n=>n.attrs.role==='progressbar').length,0);assert.ok(JSON.stringify(root).includes('CALIBRATING'));
});
test('fleet tabs provide keyboard selection and stable project identity without owner writes',()=>{
 const writes=[],root=renderJoeyView(projects,{doc:dom(),onMove:(...args)=>writes.push(args),locale:'zh-TW'}),tabs=all(root,n=>n.attrs.role==='tab');assert.equal(tabs[0].attrs['aria-selected'],'true');tabs[0].events.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(root.dataset.selectedProject,projects[1].project_id);assert.equal(tabs[1].attrs['aria-selected'],'true');assert.equal(tabs[0].tabIndex,-1);assert.equal(tabs[1].focused,true);tabs[1].events.keydown({key:'Home',preventDefault(){}});assert.equal(root.dataset.selectedProject,projects[0].project_id);assert.equal(writes.length,0);
});
test('life-state switches create a local selection; movement still requires the explicit owner action',()=>{
 const doc=dom(),w=humanWords('zh-TW'),{lifecycleControl}=createCockpitComponents({doc,w,locale:'zh-TW',localized:v=>v}),calls=[],input=structuredClone(projects[0]);const panel=lifecycleControl(input,{onMove:(m,state)=>calls.push([m.project_id,state]),readOnly:false}),button=byClass(panel,'lifecycle-state-button').find(b=>b.dataset.lifecycle==='COMPLETED'),save=byClass(panel,'lifecycle-confirm')[0];assert.equal(save.disabled,true);button.events.click();assert.equal(button.attrs['aria-pressed'],'true');assert.equal(input.product.lifecycle,null);assert.equal(calls.length,0);assert.equal(save.disabled,false);save.events.click();assert.deepEqual(calls,[[input.project_id,'COMPLETED']]);
 const readOnly=lifecycleControl(input,{onMove(){throw Error('Forbidden');},readOnly:true});assert.ok(byClass(readOnly,'lifecycle-state-button').every(b=>b.disabled));assert.equal(byClass(readOnly,'lifecycle-confirm')[0].disabled,true);
});
test('command bar describes actual source state, not fabricated runtime health',()=>{
 const doc=dom(),input=structuredClone(projects);for(const m of input)m.product.reconciliation.sourceState='MATCHED';const health={loopback:true,developmentVersion:'0.3.0-dev'};const verified=renderCommandReadouts(input,{doc,health});assert.ok(JSON.stringify(verified).includes('來源已核對'));input[0].product.reconciliation.sourceState='SOURCE_UNAVAILABLE';const missing=renderCommandReadouts(input,{doc,health});assert.ok(JSON.stringify(missing).includes('來源待確認'));assert.doesNotMatch(JSON.stringify(missing),/來源已核對|HEALTHY|ONLINE/);
});
test('flight path retains original milestone order and status, including uncertainty',()=>{
 const input=structuredClone(projects[0]);input.product.blueprint.milestones=[{id:'existing',title:'既有功能',humanDescription:'原有描述',status:'AWAITING_ACCEPTANCE',weight:1,features:[]},{id:'uncertain',title:'待確認功能',humanDescription:'既有未確認描述',status:'AWAITING_JOEY_CONFIRMATION',weight:1,features:[]}];const before=JSON.stringify(input),root=renderJoeyView([input],{doc:dom()});const nodes=byClass(root,'track-milestone');assert.deepEqual(nodes.map(n=>n.dataset.status),['AWAITING_ACCEPTANCE','AWAITING_JOEY_CONFIRMATION']);assert.equal(JSON.stringify(input),before);assert.equal(byClass(root,'waypoint-marker').length,2);
});
test('visual labels remain available in all existing UI locales',()=>{const keys=Object.keys(humanWords('zh-TW')).sort();for(const locale of ['en','ko']){assert.deepEqual(Object.keys(humanWords(locale)).sort(),keys);for(const v of Object.values(humanWords(locale)))assert.ok(v.length>0);}});
