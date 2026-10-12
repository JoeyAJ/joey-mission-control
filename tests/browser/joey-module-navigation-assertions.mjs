import assert from 'node:assert/strict';

export async function runJoeyModuleNavigationQA({page,width,locale,screens}){
 const root=page.locator('[data-joey-simple=true]'),nav=root.locator('[data-joey-modules]');
 const labels=locale==='ko'?['현황','작업','출처']:locale==='en'?['Overview','Tasks','Sources']:['總覽','任務','來源'];
 const buttons=nav.locator('button');assert.equal(await buttons.count(),3);assert.equal(await nav.evaluate(n=>getComputedStyle(n).position),'static');const navBox=await nav.boundingBox(),overviewBox=await root.locator('.joey-command-activity').boundingBox();assert(navBox.y+navBox.height<=overviewBox.y+1,'Module controls must not cover the overview');
 for(const [index,name]of ['overview','tasks','sources'].entries()){
  const button=nav.locator('[data-joey-module='+name+']');assert((await button.innerText()).includes(labels[index]));assert((await button.boundingBox()).height>=44);
 }
 await nav.locator('[data-joey-module=overview]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.joeyModule),'tasks');
 await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.dataset.joeyModule),'sources');
 await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.dataset.joeyModule),'overview');
 await nav.locator('[data-joey-module=tasks]').click();assert(await root.locator('.joey-task-details').evaluate(n=>n.open));assert.equal(await page.evaluate(()=>document.activeElement.parentElement.className),'joey-task-details');
 await nav.locator('[data-joey-module=sources]').click();assert(await root.locator('.joey-project-records').evaluate(n=>n.open));assert.equal(await nav.locator('[data-joey-module=sources]').getAttribute('aria-pressed'),'true');
 assert(await root.locator('[data-joey-overview-field=blocker]').isVisible());assert(await root.locator('[data-joey-overview-field=decision]').isVisible());
 await root.locator('.joey-task-details,.joey-project-records').evaluateAll(nodes=>nodes.forEach(n=>n.open=false));await nav.locator('[data-joey-module=overview]').click();
 assert.equal(await nav.locator('[data-joey-module=overview]').getAttribute('aria-pressed'),'true');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(locale==='ko')assert.equal(await nav.locator('button').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:screens+'/'+width+'-'+locale+'-module-navigation.png',fullPage:true});
 return {width,locale,keyboardNavigation:true,existingDisclosures:true,criticalStatusVisible:true};
}

export async function runJoeyCreationNavigationQA({page,width,screens}){
 const create=page.locator('[data-joey-create]');assert(await create.isVisible());
 assert.equal(await create.locator('[data-development-task]').count(),1);assert.equal(await create.locator('[data-new-project]').count(),1);
 for(const name of ['development-task','new-project']){const entry=create.locator('[data-'+name+'-open]');assert(await entry.isVisible());assert((await entry.boundingBox()).height>=44);assert.equal(await entry.evaluate(n=>n.closest('.joey-project-picker')),null);}
 for(const locale of ['zh-TW','en','ko']){
  await page.emulateMedia({reducedMotion:locale==='ko'?'reduce':'no-preference'});
  await page.locator('details.utility-menu').evaluate(n=>n.open=true);await page.locator('#locale-select').selectOption(locale);await page.locator('details.utility-menu').evaluate(n=>n.open=false);
  await runJoeyModuleNavigationQA({page,width,locale,screens});assert.equal(await create.locator('[data-development-task]').count(),1);assert.equal(await create.locator('[data-new-project]').count(),1);
 }
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('details.utility-menu').evaluate(n=>n.open=true);await page.locator('#locale-select').selectOption('zh-TW');await page.locator('details.utility-menu').evaluate(n=>n.open=false);
}
