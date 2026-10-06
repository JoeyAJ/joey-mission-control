async () => {
 const base='http://127.0.0.1:4352',publicApi='http://127.0.0.1:4353',errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.unroute('**/api/**');await page.unroute('**/api/public-cases');
 await page.goto(base+'/?native-server-qa=1');await page.locator('#mission-tab-JOEY_ASSET_SYSTEM').waitFor();
 if(await page.locator('.mission-tab').count()!==4||await page.locator('#data-link-status').getAttribute('data-mode')!=='local')throw Error('Actual local server did not initialize');
 const module=await page.request.get(base+'/public-cases.js');if(module.status()!==200||!module.headers()['content-type'].includes('text/javascript'))throw Error('Actual local static module unavailable');
 await page.locator('#mission-tab-JOEY_ASSET_SYSTEM').click();
 if(errors.length)throw Error(errors.join('\n'));
 let releaseHealth,healthSeen,caseFailed=true;const healthGate=new Promise(r=>releaseHealth=r),healthRequested=new Promise(r=>healthSeen=r),calls=[];
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname);
  if(url.pathname==='/api/health'){healthSeen();await healthGate;}
  if(url.pathname==='/api/public-cases'&&caseFailed)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Synthetic first-read unavailable'})});
  const response=await route.fetch({url:route.request().url().replace(base,publicApi)});await route.fulfill({response});
 });
 await page.goto(base+'/?startup-regression=1#joey?project=JOEY_ASSET_SYSTEM&module=assets&item=CASE_002_UNIVERSITY');await healthRequested;
 if(calls.some(p=>p!=='/api/health'))throw Error('Data fetched before late health resolved');
 if(await page.locator('.mission-tab').count()!==0||await page.locator('#data-link-status').getAttribute('data-mode')!=='checking')throw Error('Premature successful state');
 const neverRead=await page.locator('#data-link-status > span').innerText();releaseHealth();
 await page.locator('#data-link-status[data-failed="true"]').waitFor();
 if(await page.locator('.mission-tab').count()!==0||await page.locator('[data-public-case-detail]').count()!==0)throw Error('First failure committed partial UI');
 if(await page.locator('#data-link-status > span').innerText()!==neverRead)throw Error('First failure invented read timestamp');
 await page.screenshot({path:'output/playwright/E-first-case-503.png',fullPage:true});
 caseFailed=false;await page.locator('#data-link-status button').click();await page.locator('[data-public-case-detail="CASE_002_UNIVERSITY"]').waitFor();
 if(await page.locator('#data-link-status').getAttribute('data-failed')!=='false'||await page.locator('#data-link-status > span').innerText()===neverRead)throw Error('Startup recovery failed');
 if(errors.length)throw Error(errors.join('\n'));
 return {actualLocalServerNativeUI:true,actualStaticModule200:true,lateHealthGatesData:true,first503NoPartialCommit:true,first503NoSuccessfulRead:true,recovery:true,errors};
}
