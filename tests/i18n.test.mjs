import {canonicalRoot} from './helpers/fixtures.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {LOCALES,DEFAULT_LOCALE,LOCALE_NAMES,LOCALE_STORAGE_KEY,DICTIONARIES,t,readStoredLocale,setLocale,initLocale,getLocale,statusLabel,phaseLabel,displayValue,dirtyLabel,sessionStateLabel,classificationLabel,localizeMessage,metadataCaption,metadataState} from '../public/i18n.js';
import {buildProjection} from '../src/projection/projection-service.mjs';
import {continuationConflicts} from '../src/continue/policy-guard.mjs';
import {detectConflicts} from '../src/projection/conflict-detector.mjs';
import {interpret} from '../src/inbox/interpretation.mjs';
const root=new URL('../public/',import.meta.url);
const read=name=>fs.readFile(new URL(name,root),'utf8');
const CJK=/[㐀-鿿]/,HANGUL=/[가-힯]/;
function memoryStorage(initial={}){const data={...initial};return{data,getItem:key=>key in data?data[key]:null,setItem:(key,value)=>{data[key]=String(value);}};}

test('exactly three UI locales with Traditional Chinese default and native-name selector options',async()=>{
  assert.deepEqual(LOCALES,['zh-TW','ko','en']);assert.equal(DEFAULT_LOCALE,'zh-TW');assert.equal(Object.keys(DICTIONARIES).length,3);
  const html=await read('index.html');assert.match(html,/id="locale-select"/);
  const options=[...html.matchAll(/<option value="([^"]+)" lang="[^"]+">([^<]+)<\/option>/g)].map(m=>[m[1],m[2]]);
  assert.deepEqual(options,[['zh-TW','繁體中文'],['ko','한국어'],['en','English']]);
  for(const [code,name] of options)assert.equal(LOCALE_NAMES[code],name);
  assert.doesNotMatch(html+await read('i18n.js'),/zh-CN|简体/);
});

test('every locale dictionary has the same non-empty keys and matching placeholders',()=>{
  const keys=Object.keys(DICTIONARIES.en).sort();
  for(const locale of LOCALES){assert.deepEqual(Object.keys(DICTIONARIES[locale]).sort(),keys,locale);for(const key of keys){const value=DICTIONARIES[locale][key];assert.ok(value.trim(),`${locale} ${key}`);assert.deepEqual((value.match(/\{\w+\}/g)||[]).sort(),(DICTIONARIES.en[key].match(/\{\w+\}/g)||[]).sort(),`${locale} ${key} placeholders`);}}
});

test('Traditional Chinese and Korean entries are actually translated',()=>{
  for(const key of Object.keys(DICTIONARIES.en)){assert.match(DICTIONARIES['zh-TW'][key],CJK,`zh-TW ${key}`);assert.match(DICTIONARIES.ko[key],HANGUL,`ko ${key}`);}
});

test('static shell declares a translation key for every visible text node',async()=>{
  const html=await read('index.html');
  const keys=[...html.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g)].map(m=>m[1]);
  for(const key of keys)assert.ok(key in DICTIONARIES.en,`missing key ${key}`);
  const body=html.slice(html.indexOf('<body>'),html.indexOf('<script'));
  const fallbacks=new Set(keys.map(key=>DICTIONARIES.en[key]));
  const allowed=new Set(['Mission Control',...Object.values(LOCALE_NAMES)]);
  for(const [,raw] of body.matchAll(/>([^<>]+)</g)){const segment=raw.trim();if(!segment)continue;assert.ok(fallbacks.has(segment)||allowed.has(segment),`untranslated shell text: ${segment}`);}
  for(const [,label] of body.matchAll(/\saria-label="([^"]+)"/g))assert.ok(fallbacks.has(label),`untranslated aria-label: ${label}`);
});

test('app.js renders chrome only through translation keys that exist',async()=>{
  const js=await read('app.js');
  for(const [,key] of js.matchAll(/\bt\('([\w.]+)'/g))assert.ok(key in DICTIONARIES.en,`missing key ${key}`);
  for(const [,key] of js.matchAll(/\['(field\.\w+|continue\.\w+)',/g))assert.ok(key in DICTIONARIES.en,`missing key ${key}`);
  for(const [,key] of js.matchAll(/notify\('([\w.]+)'/g))assert.ok(key in DICTIONARIES.en,`missing key ${key}`);
  assert.doesNotMatch(js,/text\('\w+',\s*['"`][A-Za-z]/,'literal English passed to text()');
  assert.doesNotMatch(js,/notify\(['"`][A-Z]/,'literal English notice');
  assert.doesNotMatch(js,/locale\s*===|lang\s*===|'zh-TW'|'ko'/,'language conditionals belong in i18n.js');
});

test('locale preference persists locally and falls back to Traditional Chinese safely',()=>{
  const storage=memoryStorage();assert.equal(readStoredLocale(storage),'zh-TW');
  assert.equal(setLocale('ko',storage),'ko');assert.equal(storage.data[LOCALE_STORAGE_KEY],'ko');assert.equal(initLocale(storage),'ko');assert.equal(getLocale(),'ko');
  assert.equal(readStoredLocale(memoryStorage({[LOCALE_STORAGE_KEY]:'zh-CN'})),'zh-TW');
  assert.equal(readStoredLocale({getItem(){throw new Error('blocked');}}),'zh-TW');
  assert.equal(setLocale('en',{setItem(){throw new Error('blocked');}}),'en');
  setLocale('zh-TW',memoryStorage());
});

test('lifecycle and enum values map to localized labels while canonical codes stay visible',()=>{
  assert.equal(statusLabel('Paused','zh-TW'),'暫停');assert.equal(statusLabel('Completed','ko'),'완료');assert.equal(statusLabel('Active','en'),'Active');
  assert.equal(statusLabel('Unknown','zh-TW'),'未知');assert.equal(displayValue(undefined,'ko'),'알 수 없음');
  assert.equal(phaseLabel('TEST','zh-TW'),'測試 (TEST)');assert.equal(phaseLabel('MAINTAIN','ko'),'유지보수 (MAINTAIN)');assert.equal(phaseLabel('BUILD','en'),'BUILD');
  assert.equal(dirtyLabel('untracked+modified','zh-TW'),'有未追蹤檔案 + 有修改');assert.equal(sessionStateLabel('waiting_for_joey','ko'),'Joey 대기 중');
  assert.equal(classificationLabel('canonical','zh-TW'),'正式來源');
  assert.equal(statusLabel('Something canonical','zh-TW'),'Something canonical','unknown canonical text passes through verbatim');
});

test('fixed backend messages are localized but embedded technical evidence is preserved',()=>{
  const conflicts=[...continuationConflicts({git:{},storedContext:{viewedSession:{model:'gpt-x'},currentSession:{model:'gpt-y'},fingerprints:[{path:'/canon/A.md',fingerprint:'a'.repeat(64)}]},currentFingerprints:[]}),...detectConflicts({storedHead:'a',observedHead:'b',branch:'main',observedBranch:'dev',localMaster:'/a',observedPath:'/b'}).map(item=>item.message)];
  const preview=interpret({rawText:'note for woosong'},{knownEntityIds:['WOOSONG_BUDDY']});
  for(const message of [...conflicts,...preview.sideEffects,preview.approvalBoundary,'Malformed Handoff blocks continuation: Missing task; Missing status']){
    for(const locale of ['zh-TW','ko']){const localized=localizeMessage(message,locale);assert.notEqual(localized,message,`${locale}: ${message}`);assert.match(localized,locale==='ko'?HANGUL:CJK);}
    assert.equal(localizeMessage(message,'en'),message);
  }
  assert.match(localizeMessage('Stale source fingerprint: /canon/A.md','zh-TW'),/\/canon\/A\.md/);
  assert.match(localizeMessage('Viewed AI session model is stale','ko'),/model/);
  assert.match(localizeMessage('Git observation failed: fatal: not a git repository','zh-TW'),/fatal: not a git repository/);
  assert.equal(localizeMessage('Unrecognised schema error at /items/0','zh-TW'),'Unrecognised schema error at /items/0');
});

test('rendering labels in every locale never mutates canonical projection data',async()=>{
  const projection=await buildProjection(canonicalRoot);const snapshot=JSON.stringify(projection);
  for(const locale of LOCALES)for(const project of [...projection.projects,...projection.cases]){statusLabel(project.status.value,locale);phaseLabel(project.phase.value,locale);for(const conflict of project.conflicts)localizeMessage(conflict.message,locale);dirtyLabel(project.workspaceObservation?.dirtyState,locale);t('project.title',{name:project.name.value},locale);}
  assert.equal(JSON.stringify(projection),snapshot);
  const js=await read('app.js');
  assert.match(js,/filter\(project=>value\(project\.status\)===filter\)/,'filters compare canonical status values');
  assert.match(js,/function applyLocale\(locale\)\{setLocale\(locale\);[^}]*if\(state\)render\(state\)/,'locale switch re-renders the cached snapshot');
  assert.doesNotMatch(js.slice(js.indexOf('function applyLocale'),js.indexOf("$('#locale-select').addEventListener")),/api\(|fetch\(/,'locale switch performs no request');
  assert.doesNotMatch(js,/JSON\.stringify\(\{[^}]*locale/,'locale is never sent to the API');
});

test('server serves only the explicitly allowlisted presentation modules',async()=>{
  const server=await fs.readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
  assert.match(server,/\['index\.html','styles\.css','app\.js','i18n\.js','presentation\.js','source-summaries\.js','control-semantics\.js','project-links\.js','decision-view\.js','agent-detail\.js','joey-view\.js','joey-takeover\.js','report-time\.js','takeover-instruction\.js','repository-run-reporter-source\.js','joey-operations\.js','phase-summary\.js','proposals\.js','public-cases\.js','proposal-navigation\.js','joey-cockpit\.js','joey-controls\.js','visual-system\.js','brand-eye-source\.png','project-state\.js','project-state-controls\.js','command-workspace\.js','task-workflow-config\.js','workspace-reading\.js','stage-changes\.js','private-continuity-status\.js','owner-auth-config\.js','owner-auth-client\.js','owner-recovery-config\.js','owner-password-recovery\.html','owner-password-recovery-client\.js','owner-email-login-config\.js','owner-email-login\.html','owner-email-login-client\.js'\]/);
});

test('new terminal failure state is translated in all three locales',()=>{assert.equal(sessionStateLabel('failed','zh-TW'),'失敗');assert.equal(sessionStateLabel('failed','ko'),'실패');assert.equal(sessionStateLabel('failed','en'),'failed');});


test('metadata captions qualify evidence without rewriting canonical identity or inventing unknown states',()=>{
 const source={repositoryId:'private/example',resolvedCommitSha:'a'.repeat(40),documentTimestamp:null,status:'FOUND'},before=JSON.stringify(source);
 for(const locale of LOCALES){assert.notEqual(metadataCaption('repositoryId',locale),'repositoryId');assert.notEqual(metadataState('PARENT_IMPORTED_VISIBLE_SUMMARY',locale),'PARENT_IMPORTED_VISIBLE_SUMMARY');assert.equal(metadataState('NEW_UNVERIFIED_CODE',locale),metadataCaption('unmapped',locale));assert.equal(metadataState(null,locale),metadataCaption('unknown',locale));}
 assert.equal(metadataCaption('readAt','unknown-locale'),metadataCaption('readAt','zh-TW'));assert.equal(metadataState('FOUND'),metadataState('FOUND','zh-TW'));assert.equal(JSON.stringify(source),before);
});
