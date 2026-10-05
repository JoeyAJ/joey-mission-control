import test from 'node:test';
import assert from 'node:assert/strict';
import {config,parseStartOptions} from '../src/config.mjs';
test('local start flags isolate acceptance port/data without changing ordinary defaults',()=>{
 assert.deepEqual(parseStartOptions([]),{port:config.port,dataRoot:config.dataRoot});
 assert.deepEqual(parseStartOptions(['--port','4312','--data-root','/private/tmp/mc-acceptance']),{port:4312,dataRoot:'/private/tmp/mc-acceptance'});
});
test('local start rejects unknown flags, unsafe paths and invalid ports',()=>{
 for(const args of [['--host','0.0.0.0'],['--port','0'],['--port','65536'],['--port','4312;echo'],['--port'],['--data-root','relative'],['--data-root','/tmp/\0bad']])assert.throws(()=>parseStartOptions(args));
});
