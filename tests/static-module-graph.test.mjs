import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createApp} from '../src/server.mjs';
test('actual local handler serves the complete index module graph including public-cases',async t=>{
 const server=http.createServer(createApp({}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`,visited=new Set();
 const index=await fetch(base+'/');assert.equal(index.status,200);const html=await index.text();
 const queue=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>new URL(m[1],base).pathname);assert.ok(queue.length);
 while(queue.length){const name=queue.shift();if(visited.has(name))continue;visited.add(name);const r=await fetch(base+name);assert.equal(r.status,200,name);assert.match(r.headers.get('content-type'),/text\/javascript/);assert.equal(r.headers.get('x-content-type-options'),'nosniff');const code=await r.text();for(const match of code.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?['"](\.\.?\/[^'"]+)['"]/g))queue.push(new URL(match[1],base+name).pathname);}
 assert.ok(visited.has('/public-cases.js'));assert.ok(visited.size>10);
 assert.equal((await fetch(base+'/not-allowed.js')).status,404);
});
