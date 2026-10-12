import test from 'node:test';import assert from 'node:assert/strict';
import {reportedAttention} from '../src/reporting/workbench-rail-view.mjs';
test('Joey review is only a current fresh reported blocker/failure, never stale/future/running/approval',()=>{
 const now=Date.parse('2026-10-12T06:00:00Z'),row=(state,age,freshness='FRESH')=>({presentation:{currentState:state,freshness,eventAt:new Date(now-age).toISOString()}});
 const blocked=row('blocked',10),failed=row('failed',10),rows=[blocked,failed,row('blocked',300000),row('blocked',-1),row('blocked',10,'STALE'),row('running',10),row('completed',10)];assert.deepEqual(reportedAttention(rows,now),[blocked,failed]);
});
