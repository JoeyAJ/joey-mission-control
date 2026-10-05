import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {JsonStore} from '../src/storage/json-store.mjs';
test('initializes and atomically round-trips validated JSON',async()=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-s-'));const s=new JsonStore(d,'x.json',x=>Array.isArray(x));assert.deepEqual(await s.read(),[]);await s.write([{a:1}]);assert.deepEqual(await s.read(),[{a:1}]);assert.deepEqual((await fs.readdir(d)).filter(x=>x.includes('.tmp')),[]);});
test('quarantines corruption without silent loss and blocks traversal/symlink escape',async()=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-s-'));await fs.writeFile(path.join(d,'x.json'),'{bad');const s=new JsonStore(d,'x.json',()=>true);await assert.rejects(()=>s.read(),/corrupt/);assert.ok((await fs.readdir(d)).some(x=>x.includes('.corrupt.')));assert.throws(()=>new JsonStore(d,'../x',()=>true));});

test('rejects symlinked store files and symlinked parent components',async()=>{
  const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-symlink-'));
  const outside=await fs.mkdtemp(path.join(os.tmpdir(),'mc-outside-'));
  await fs.writeFile(path.join(outside,'target.json'),'[]');
  await fs.symlink(path.join(outside,'target.json'),path.join(d,'file-link.json'));
  await assert.rejects(()=>new JsonStore(d,'file-link.json',Array.isArray).read(),/symlink/i);
  await fs.symlink(outside,path.join(d,'parent-link'));
  await assert.rejects(()=>new JsonStore(d,'parent-link/target.json',Array.isArray).read(),/symlink/i);
  assert.equal(await fs.readFile(path.join(outside,'target.json'),'utf8'),'[]');
});

test('serializes concurrent updates without lost records or temp collisions',async()=>{
  const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-concurrent-'));
  const store=new JsonStore(d,'records.json',Array.isArray);
  await Promise.all(Array.from({length:50},(_,id)=>store.update(async records=>{
    await new Promise(resolve=>setTimeout(resolve,id%3));
    return [...records,{id}];
  })));
  const records=await store.read();
  assert.equal(records.length,50);
  assert.equal(new Set(records.map(x=>x.id)).size,50);
  assert.deepEqual((await fs.readdir(d)).filter(name=>name.endsWith('.tmp')),[]);
});

test('serializes updates across separate JsonStore instances',async()=>{
  const d=await fs.mkdtemp(path.join(os.tmpdir(),'mc-cross-instance-'));
  const first=new JsonStore(d,'records.json',Array.isArray);
  const second=new JsonStore(d,'records.json',Array.isArray);
  const update=(store,id,delay)=>store.update(async records=>{await new Promise(resolve=>setTimeout(resolve,delay));return[...records,{id}];});
  await Promise.all([update(first,'a',30),update(second,'b',10)]);
  const records=await first.read();
  assert.equal(records.length,2);
  assert.equal(new Set(records.map(item=>item.id)).size,2);
});
