import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {semanticStatus,initLiquidInteraction,visualLabels,renderSidebar} from '../public/visual-system.js';
import {createApp} from '../src/server.mjs';

test('semantic display aliases distinguish attention, blockers, pauses, progress and unknown',()=>{
 for(const [state,value] of [['COMPLETED','completed'],['IN_PROGRESS','progress'],['WAITING_JOEY','waiting'],['TECHNICAL_BLOCKER','blocked'],['ERROR','blocked'],['PAUSED','paused'],['PLANNING','planned'],['READY','ready'],['ACTIVE','working'],[null,'unknown'],['new-state','unknown']])assert.equal(semanticStatus(state),value);
});
test('delegated liquid pointer updates coalesce into one frame and stop under reduced motion',()=>{
 const events={},styles=new Map(),classes=new Set(),frames=new Map(),cancelled=[];let serial=0;
 const card={style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)},getBoundingClientRect:()=>({left:10,top:20}),contains:n=>n===card};
 const root={addEventListener:(k,f)=>events[k]=f,removeEventListener:k=>delete events[k],contains:n=>n===card};let motionChange;
 const media={matches:false,addEventListener:(k,f)=>motionChange=f,removeEventListener:()=>{motionChange=null;}};
 const dispose=initLiquidInteraction(root,{media,raf:f=>{frames.set(++serial,f);return serial;},cancel:id=>{cancelled.push(id);frames.delete(id);}});
 const target={closest:()=>card};events.pointermove({target,clientX:30,clientY:60,pointerType:'mouse'});events.pointermove({target,clientX:80,clientY:90,pointerType:'mouse'});assert.equal(frames.size,1);frames.get(1)();frames.delete(1);assert.equal(styles.get('--mouse-x'),'70px');assert.equal(styles.get('--mouse-y'),'70px');assert.ok(classes.has('liquid-tracking'));
 events.pointermove({target,clientX:100,clientY:120,pointerType:'mouse'});media.matches=true;motionChange();assert.equal(frames.size,0);assert.ok(cancelled.includes(2));assert.equal(styles.size,0);assert.equal(classes.size,0);events.pointermove({target,clientX:100,clientY:120,pointerType:'mouse'});assert.equal(frames.size,0);dispose();assert.deepEqual(events,{});
});
test('static logo delivery preserves the supplied binary PNG instead of decoding it as text',async()=>{
 let status,headers,body;await createApp({})({headers:{host:'127.0.0.1'},method:'GET',url:'/brand-eye-source.png'},{writeHead:(s,h)=>{status=s;headers=h;},end:b=>body=b});assert.equal(status,200);assert.equal(headers['Content-Type'],'image/png');const original=await fs.readFile(new URL('../public/brand-eye-source.png',import.meta.url));assert.ok(Buffer.isBuffer(body));assert.deepEqual(body,original);assert.deepEqual([...body.subarray(0,8)],[137,80,78,71,13,10,26,10]);
});
test('new visual chrome labels are complete in all three supported locales',()=>{const keys=Object.keys(visualLabels('zh-TW')).sort();for(const locale of ['en','ko']){assert.deepEqual(Object.keys(visualLabels(locale)).sort(),keys);for(const value of Object.values(visualLabels(locale)))assert.ok(value.trim());}});
test('sidebar counts only recorded lifecycle values and never invents agent availability',()=>{
 const doc={createElement:tag=>({tag,children:[],dataset:{},events:{},append(...n){this.children.push(...n);},setAttribute(){},addEventListener(k,f){this.events[k]=f;}})};
 const input=[{product:{lifecycle:null}},{product:{lifecycle:'PAUSED'}}],before=JSON.stringify(input),root=renderSidebar(input,{doc,locale:'en',w:{IDEA:'Idea',PLANNING:'Planning',IN_PROGRESS:'In progress',PAUSED:'Paused',COMPLETED:'Completed',ARCHIVED:'Archived'},onLifecycle(){}});
 const walk=n=>[n,...n.children.flatMap(walk)],nodes=walk(root);assert.equal(nodes.find(n=>n.className==='sidebar-state mc-button'&&n.dataset.semantic==='paused').children[1].textContent,'1');assert.equal(nodes.filter(n=>n.className==='fleet-readout').length,5);assert.ok(nodes.filter(n=>n.className==='fleet-readout').every(n=>n.dataset.semantic==='unknown'));assert.doesNotMatch(JSON.stringify(root),/Online|Ready/);assert.equal(JSON.stringify(input),before);
});
