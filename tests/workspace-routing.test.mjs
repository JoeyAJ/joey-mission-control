import test from 'node:test';
import assert from 'node:assert/strict';
import {readContext,contextHash} from '../public/proposal-navigation.js';
import {workspaceHash,readWorkspacePanel} from '../public/command-workspace.js';

test('Mission Control deep links restore only the workspace console, including links without module',()=>{
 for(const hash of ['#workspace?project=MISSION_CONTROL&panel=events',workspaceHash({project:'MISSION_CONTROL',panel:'events'}),'#workspace?project=MISSION_CONTROL&module=proposal&panel=entries']){
  assert.deepEqual(readContext(hash),{project:'MISSION_CONTROL',module:'console',item:null});
 }
 const hash=workspaceHash({project:'MISSION_CONTROL',panel:'context',item:'source'});
 assert.equal(readContext(hash).item,'source');assert.equal(readWorkspacePanel(hash),'context');
});

test('workspace navigation does not expand proposal project scope or unknown project routing',()=>{
 for(const route of ['joey','project','dashboard','workspace-other'])assert.equal(readContext('#'+route+'?project=MISSION_CONTROL&module=proposal').project,'NEXAEON');
 assert.equal(readContext(contextHash({project:'MISSION_CONTROL',module:'proposal'})).project,'NEXAEON');
 assert.equal(readContext('#workspace?project=UNKNOWN&module=console').project,'NEXAEON');
 for(const project of ['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'])for(const module of ['overview','ideas','proposal','assets','console'])assert.deepEqual(readContext(contextHash({project,module})),{project,module,item:null});
});


test('only Asset University candidate track is retained in portable workspace routes',()=>{
 const hash=workspaceHash({project:'JOEY_ASSET_SYSTEM',panel:'events',track:'UNIVERSITY_CANDIDATE'});
 assert.equal(new URLSearchParams(hash.split('?')[1]).get('track'),'UNIVERSITY_CANDIDATE');
 for(const project of ['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','MISSION_CONTROL'])assert(!workspaceHash({project,track:'UNIVERSITY_CANDIDATE'}).includes('track='));
 for(const track of ['arbitrary/private-ref','BASELINE','UNKNOWN'])assert(!workspaceHash({project:'JOEY_ASSET_SYSTEM',track}).includes('track='));
 assert(!hash.includes('77b6766'));assert(!hash.includes('DEVELOPMENT.md'));
});
