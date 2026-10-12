import assert from 'node:assert/strict';

export async function runWorkspacePanePresentationQA({page,width,locale,ready,refresh,screens}){
 const reduced=locale==='ko',root=page.locator('#command-workspace'),controls=page.locator('.command-pane-views'),layout=page.locator('.command-layout');
 if(width<=768){assert.equal(await controls.isVisible(),false);assert.equal(await page.locator('.command-mobile-tabs').isVisible(),true);return{panePresentation:true,mobileNativeTabs:true};}
 const file=page.locator('.command-layout>.command-explorer'),evidence=page.locator('.command-context'),report=page.locator('.command-events');
 const select=async name=>{await page.locator('[data-pane-focus-control='+name+']').click();assert.equal(await root.getAttribute('data-pane-focus'),name);};
 await select('overview');await page.waitForTimeout(500);const first=await file.boundingBox(),firstEvidence=await evidence.boundingBox(),task=await page.locator('.run-focus-heading .selected-task-title').innerText();
 await select('files');await page.waitForTimeout(110);const mid=await file.boundingBox();await page.waitForTimeout(420);const full=await file.boundingBox();
 assert(full.height>first.height+80,JSON.stringify({first,full}));if(!reduced)assert(mid.height>first.height+5&&mid.height<full.height-5,JSON.stringify({first,mid,full}));else assert(Math.abs(mid.height-full.height)<1);
 assert.equal(await page.locator('.run-focus-heading .selected-task-title').innerText(),task);assert(await page.locator('[data-pane-focus-control=files]').evaluate(n=>n===document.activeElement));
 await page.screenshot({path:screens+'/'+width+'-'+locale+'-files-expanded.png',fullPage:true});
 await select('evidence');await page.waitForTimeout(110);const midEvidence=await evidence.boundingBox();await page.waitForTimeout(420);const fullEvidence=await evidence.boundingBox();
 assert(fullEvidence.width>firstEvidence.width+100);if(!reduced)assert(midEvidence.width>firstEvidence.width+5&&midEvidence.width<fullEvidence.width-5);else assert(Math.abs(midEvidence.width-fullEvidence.width)<1);
 for(const pane of [report,file,evidence,page.locator('.command-projects')])assert(await pane.isVisible());assert.equal(await page.locator('.run-focus-heading .selected-task-title').innerText(),task);
 await page.screenshot({path:screens+'/'+width+'-'+locale+'-evidence-expanded.png',fullPage:true});
 await refresh();await ready();assert.equal(await root.getAttribute('data-pane-focus'),'evidence');assert.equal(await page.locator('[data-pane-focus-control=evidence]').getAttribute('aria-pressed'),'true');
 await select('reports');await page.waitForTimeout(500);const reportsExpanded=await report.boundingBox();assert(reportsExpanded.height>first.height*1.2);
 await select('files');await page.waitForTimeout(100);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(40);assert.equal(await layout.evaluate(n=>n.getAnimations().length),0,'reducing motion stops reflow immediately');
 await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await select('overview');await page.waitForTimeout(500);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 return{panePresentation:true,continuousReflow:!reduced,reducedInstant:reduced,allFourPanesRemain:true,focusAndFactsPreserved:true,viewSurvivesSourceRefresh:true};
}
