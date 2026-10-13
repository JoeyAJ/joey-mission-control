import assert from 'node:assert/strict';

export async function runJoeyModuleNavigationQA({page,width,locale,screens}){
 const root=page.locator('[data-joey-simple=true]'),nav=root.locator('[data-joey-modules]');
 const labels=locale==='ko'?['내 프로젝트','현재 진행','내 결정 대기']:locale==='en'?['My projects','Current progress','Pending my decision']:['我的專案','目前進度','等待我決策'];
 const buttons=nav.locator('button');assert.equal(await buttons.count(),3);assert.equal(await nav.evaluate(n=>getComputedStyle(n).position),'static');const navBox=await nav.boundingBox(),overviewBox=await root.locator('.joey-command-activity').boundingBox();assert(navBox.y+navBox.height<=overviewBox.y+1,'Module controls must not cover the overview');
 for(const [index,name]of ['projects','progress','decisions'].entries()){
  const button=nav.locator('[data-joey-module='+name+']');assert((await button.innerText()).includes(labels[index]));assert((await button.boundingBox()).height>=44);
 }
 await nav.locator('[data-joey-module=projects]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.joeyModule),'progress');
 await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.dataset.joeyModule),'decisions');
 await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.dataset.joeyModule),'projects');
 await nav.locator('[data-joey-module=progress]').click();assert(await root.locator('[data-joey-daily=progress]').isVisible());
 await nav.locator('[data-joey-module=decisions]').click();assert(await root.locator('[data-joey-daily=decisions]').isVisible());assert.equal(await nav.locator('[data-joey-module=decisions]').getAttribute('aria-pressed'),'true');
 assert(await root.locator('[data-joey-overview-field=blocker]').isVisible());assert(await root.locator('[data-joey-overview-field=decision]').isVisible());
 await root.locator('.joey-task-details,.joey-project-records').evaluateAll(nodes=>nodes.forEach(n=>n.open=false));await nav.locator('[data-joey-module=projects]').click();
 assert.equal(await nav.locator('[data-joey-module=projects]').getAttribute('aria-pressed'),'true');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(locale==='ko')assert.equal(await nav.locator('button').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:screens+'/'+width+'-'+locale+'-module-navigation.png',fullPage:true});
 return {width,locale,keyboardNavigation:true,existingDisclosures:true,criticalStatusVisible:true};
}

export async function runJoeyCreationNavigationQA({page,width,screens}){
 await page.locator('[data-joey-advanced]').evaluate(n=>n.open=true);const create=page.locator('[data-joey-create]');assert(await create.isVisible());
 assert.equal(await create.locator('[data-development-task]').count(),1);assert.equal(await create.locator('[data-new-project]').count(),1);
 for(const name of ['development-task','new-project']){const entry=create.locator('[data-'+name+'-open]');assert(await entry.isVisible());assert((await entry.boundingBox()).height>=44);assert.equal(await entry.evaluate(n=>n.closest('.joey-project-picker')),null);}
 for(const locale of ['zh-TW','en','ko']){
  await page.emulateMedia({reducedMotion:locale==='ko'?'reduce':'no-preference'});
  await page.locator('details.utility-menu').evaluate(n=>n.open=true);await page.locator('#locale-select').selectOption(locale);await page.locator('details.utility-menu').evaluate(n=>n.open=false);
  await runJoeyModuleNavigationQA({page,width,locale,screens});assert.equal(await create.locator('[data-development-task]').count(),1);assert.equal(await create.locator('[data-new-project]').count(),1);
 }
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('details.utility-menu').evaluate(n=>n.open=true);await page.locator('#locale-select').selectOption('zh-TW');await page.locator('details.utility-menu').evaluate(n=>n.open=false);
}
