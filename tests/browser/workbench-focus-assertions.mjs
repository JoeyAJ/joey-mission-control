import assert from 'node:assert/strict';

export async function runWorkbenchFocusQA({page,width,locale,state,ready,refresh,screens,before=false}){
 const mobile=width<=768,detail=()=>page.locator('[data-run-workbench=detail]');
 const panel=async name=>{if(mobile)await page.locator('[data-workspace-panel='+name+']').click();};
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const choose=async id=>{await panel('entries');await page.locator('[data-card-scope=current][data-run-selection='+id+']').focus();await page.keyboard.press('Enter');await page.waitForFunction(id=>document.querySelector('[data-run-workbench=detail]')?.dataset.selectedRun===id,id);await settle();};
 const capture=label=>page.screenshot({path:screens+'/'+width+'-'+locale+'-'+(before?'before':'after')+'-'+label+'.png',fullPage:true});
 const focus=()=>page.locator('[data-run-workbench=focus]'),brief=()=>focus().locator('[data-selected-task-summary=confirmed]');
 await choose('synthetic-live-fixture');
 if(!before){
  assert.equal(await brief().getAttribute('data-selected-task-run'),'synthetic-live-fixture');
  assert.equal(await page.locator('[data-selected-task-summary=confirmed]').count(),1);
  assert.equal(await page.locator('[data-run-workbench=events] [data-selected-task-summary]').count(),0);
  assert((await brief().locator('.run-focus-project').innerText()).includes('Mission Control'));
  assert((await brief().locator('.selected-task-agent').innerText()).includes('Synthetic Codex'));
  assert.equal(await brief().locator('.selected-task-title').innerText(),state.featureTitle||'Synthetic configuration verification (not product completion)');
  assert(await brief().isVisible());assert.equal(await brief().locator('details[open]').count(),0);
  assert(await brief().locator('.selected-task-delivery').isVisible());
  assert(!(await brief().locator('.selected-task-date').isVisible()));
  await panel('entries');assert(await page.locator('[data-card-scope=current][data-run-selection=synthetic-live-fixture] .run-card-agent').isVisible());await panel('context');await settle();
 }
 await capture('fresh-context');
 if(!before){
  for(const name of ['entries','events','context']){await panel(name);await settle();assert(await brief().isVisible());assert.equal(await brief().getAttribute('data-selected-task-run'),'synthetic-live-fixture');}
  const summary=brief().locator('.selected-task-title-disclosure > summary');await summary.focus();await page.keyboard.press('Enter');assert(await brief().locator('.selected-task-date').isVisible());
  await brief().locator('[data-disclosure=task-evidence] > summary').click();assert(await brief().locator('dl').isVisible());await capture('expanded-details');
  await summary.focus();await refresh();await ready();await settle();assert(await brief().locator('.selected-task-date').isVisible());assert(await brief().locator('dl').isVisible());assert(await page.evaluate(()=>document.activeElement?.dataset.runControl==='focus'));
  await summary.focus();await page.keyboard.press('Enter');assert(!(await brief().locator('.selected-task-date').isVisible()));
  await choose('synthetic-second-run');assert.equal(await brief().getAttribute('data-selected-task-run'),'synthetic-second-run');assert((await brief().locator('.selected-task-agent').innerText()).includes('Synthetic Claude'));assert(!(await brief().locator('.selected-task-date').isVisible()));await choose('synthetic-live-fixture');
 }
 state.reportEvents=[{kind:'blocked',at:Date.now(),summary:'Synthetic blocker: Owner decision required'}];await refresh();await ready();await settle();
 if(!before){assert.equal(await brief().getAttribute('data-current-state'),'blocked');assert(await brief().locator('.selected-task-blocker').isVisible());assert((await brief().innerText()).includes('Synthetic blocker: Owner decision required'));assert(!(await brief().locator('.selected-task-date').isVisible()));}
 await capture('blocked');await choose('synthetic-stale-task');
 if(!before){assert.equal(await brief().getAttribute('data-current-state'),'unconfirmed');assert.equal(await focus().locator('[data-workbench-motion]').count(),0);assert(await brief().isVisible());}
 await capture('dated-task');
 if(before)return{width,locale,pass:true,beforeCaptureOnly:true};
 await panel('entries');state.reportEnabled=false;await page.locator('[data-command-project=WOOSONG_BUDDY]').click();await page.locator('[data-run-workbench=events][data-workbench-state=empty]').waitFor({state:'attached'});await settle();assert.equal(await focus().getAttribute('data-workbench-state'),'empty');assert.equal(await brief().count(),0);assert((await focus().innerText()).includes('Woosong Buddy'));await capture('empty');
 state.active=false;await page.evaluate(()=>document.querySelector('#owner-workspace-access').sourceController.start());await page.waitForFunction(()=>document.querySelector('[data-run-workbench=events]')?.dataset.workbenchState==='unconfirmed');assert.equal(await focus().getAttribute('data-workbench-state'),'unconfirmed');assert.equal(await brief().count(),0);assert(!(await focus().innerText()).includes('Synthetic Codex'));await capture('unconfirmed');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 return{width,locale,pass:true,oneSelectedOverview:true,linkedAgentTask:true,persistentAcrossMobilePanes:true,nativeKeyboardDisclosure:true,disclosureAndFocusAfterReread:true,blockerAlwaysVisible:true,datedStateQualified:true,emptyAndRefusalCleared:true,reducedMotion:locale==='ko'};
}
