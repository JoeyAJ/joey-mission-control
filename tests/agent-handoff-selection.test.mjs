import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerAgentSelection} from '../src/continuity/agent-handoff-selection.mjs';
test('Owner choices accept replaceable agents, providers and models without a provider catalogue',()=>{
 for(const model of ['provider-a/model-a','local/model-b','新模型'])assert.equal(ownerAgentSelection({agent:'New agent',provider:'Any provider',model}).model,model);
 assert.deepEqual(ownerAgentSelection(),{qualification:'OWNER_SELECTION',agent:null,provider:null,model:null});
 assert.equal(ownerAgentSelection({model:' model-x ',apiKey:'IGNORED_SYNTHETIC_CREDENTIAL'}).model,'model-x');
 assert(!JSON.stringify(ownerAgentSelection({apiKey:'IGNORED_SYNTHETIC_CREDENTIAL'})).includes('CREDENTIAL'));
});
test('Owner intent rejects unbounded or control-bearing values without interpreting them as execution',()=>{
 for(const value of [null,[],{model:'x'.repeat(129)},{agent:'a\ncommand'},{provider:3}])assert.throws(()=>ownerAgentSelection(value),/OWNER_AGENT_SELECTION_INVALID/);
 const choice=ownerAgentSelection({agent:'<script>inert</script>',model:'replacement-model'});assert.equal(choice.agent,'<script>inert</script>');assert(Object.isFrozen(choice));assert(!('executionAuthorized' in choice));
});
