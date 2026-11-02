import test from 'node:test';
import assert from 'node:assert/strict';
import {withMissionControlProject,missionControlLinks,missionControlTakeover} from '../public/mission-control-project.js';
import {towerModel} from '../public/tower-model.js';
import {renderControlTower} from '../public/control-tower.js';
const fixed=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'].map(id=>({id,name:id,status:'Active'}));
const storage={getItem:()=>null,setItem(){}};
function fakeDoc(){return{createElement(tag){return{tag,children:[],className:'',textContent:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){}},setAttribute(){},append(...c){this.children.push(...c);},prepend(...c){this.children.unshift(...c);},addEventListener(){},querySelector(){return null;},remove(){}};}};}
const all=n=>[n,...(n.children||[]).flatMap(all)];
test('existing MC identity coexists with all five projects and repeated composition stays unique',()=>{
 const engine={id:'AI_INTERACTIVE_EXPERIENCE_ENGINE',name:'AI Engine',kind:'registered',status:'Active'};
 const input=[...fixed,engine],combined=withMissionControlProject(input);
 assert.equal(input.length,5);assert.equal(combined.length,6);assert.strictEqual(withMissionControlProject(combined),combined);
 assert.deepEqual(combined.slice(0,5),input);assert.equal(new Set(combined.map(p=>p.id)).size,6);
 const mc=towerModel({projects:combined,runsByProject:{},storage}).cards.find(p=>p.id==='MISSION_CONTROL');
 assert.equal(mc.version,null);assert.equal(mc.lastAgent,null);assert.equal(mc.updatedAt,null);assert.equal(mc.state,'push');
});
test('MC detail links use current main, preserve verified legacy report binding and have three locales',()=>{
 for(const locale of ['zh-TW','ko','en']){
  const links=missionControlLinks(locale);assert.equal(links.length,4);
  assert.ok(links.every(([label,url])=>label&&url.startsWith('https://github.com/JoeyAJ/joey-mission-control/')&&url.includes('/main')));
  const owned=renderControlTower({doc:fakeDoc(),projects:withMissionControlProject(fixed),runsByProject:{},locale,storage,detailId:'MISSION_CONTROL'});
  assert.deepEqual(all(owned).filter(n=>n.tag==='a'&&n.href?.startsWith('https://github.com/')).map(n=>n.href),links.map(([,url])=>url));
  const guest=renderControlTower({doc:fakeDoc(),projects:withMissionControlProject(fixed),runsByProject:{},locale,storage,detailId:'MISSION_CONTROL',guest:true});
  assert.equal(all(guest).filter(n=>n.href?.includes('github.com')).length,0);
 }
 const original='verified packet checkpoint ref and digest';const text=missionControlTakeover(original);
 assert.ok(text.endsWith(original));assert.match(text,/Fresh-read origin\/main/);assert.match(text,/Preserve its binding for reports/);
});
