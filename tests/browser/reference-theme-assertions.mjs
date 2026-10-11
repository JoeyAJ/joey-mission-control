import assert from 'node:assert/strict';

// Rendered contrast and interaction checks; no source/report text is collected.
export async function assertReferenceTheme(page,{mode,width}){
 const briefScope=mode==='workspace'?'#workspace .selected-task-brief':'section[data-joey-simple=true] .selected-task-brief';
 const disclosureSelector=briefScope+' .selected-task-disclosure>summary';
 const previous=await page.evaluateHandle(()=>document.activeElement);
 await page.locator(disclosureSelector).first().focus();
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 const receipt=await page.evaluate(({mode,width,briefScope,disclosureSelector})=>{
  const style=selector=>{const n=document.querySelector(selector);if(!n)throw Error('Missing theme surface: '+selector);const s=getComputedStyle(n),r=n.getBoundingClientRect();return{color:s.color,background:s.backgroundColor,border:s.borderTopColor,radius:parseFloat(s.borderTopLeftRadius),height:r.height,transition:s.transitionDuration};};
  const rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number),lum=c=>rgb(c).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0),contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const body=style('body'),agent=style(briefScope+' .selected-task-agent'),date=style(briefScope+' .selected-task-date'),disclosure=style(disclosureSelector);
  const selector=mode==='joey'?'[data-joey-primary]':'.run-workbench-card[aria-pressed=true]',action=style(selector);
  const focus=getComputedStyle(document.querySelector(disclosureSelector)).outlineColor;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const card=style(mode==='joey'?'.joey-mobile-activity':'.run-workbench-card');
  const panes=mode==='workspace'?[...document.querySelectorAll('#workspace .command-layout>:is(.command-projects,.command-events,.command-explorer,.command-context)')].map(n=>getComputedStyle(n).backgroundColor):[];
  return{mode,width,body:body.background,action,cardRadius:card.radius,focus,reduced,panes,agentContrast:contrast(agent.color,body.background),dateContrast:contrast(date.color,body.background),disclosureContrast:contrast(disclosure.color,body.background),actionContrast:contrast(action.color,action.background),controlBorderContrast:contrast(action.border,body.background),touchDisclosureHeight:disclosure.height,overflow:document.documentElement.scrollWidth>innerWidth+1};
 },{mode,width,briefScope,disclosureSelector});
 await previous.evaluate(n=>n?.isConnected&&n.focus({preventScroll:true}));await previous.dispose();
 assert.equal(receipt.body,'rgb(26, 26, 25)');
 assert(receipt.agentContrast>=4.5&&receipt.dateContrast>=4.5&&receipt.disclosureContrast>=4.5);
 assert(receipt.actionContrast>=4.5&&receipt.controlBorderContrast>=3);
 assert(receipt.cardRadius>=14);
 assert.equal(receipt.focus,'rgb(36, 211, 239)');
 assert.equal(receipt.overflow,false);
 if(mode==='joey'){assert.equal(receipt.action.background,'rgb(255, 255, 255)');assert.equal(receipt.action.color,'rgb(11, 11, 11)');assert(receipt.action.height>=44);}
 else{assert.equal(receipt.panes.length,4);assert(receipt.panes.every(c=>c==='rgb(26, 26, 25)'));assert.equal(receipt.action.border,'rgb(36, 211, 239)');if(receipt.reduced)assert.equal(receipt.action.transition,'0s');}
 if(width<=768)assert(receipt.touchDisclosureHeight>=44);
 return receipt;
}

export async function assertReportedArrivalMotion(page,{width,locale}){
 const receipt=await page.evaluate(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fresh=[...document.querySelectorAll('[data-run-workbench=events] [data-new-report-event]')];
  return{reduced,newEvents:fresh.length,animations:fresh.map(n=>{const s=getComputedStyle(n);return{name:s.animationName,duration:s.animationDuration,iterations:s.animationIterationCount};}),unboundAnimations:document.querySelectorAll('.run-event-arrived:not([data-new-report-event])').length};
 });
 assert(receipt.newEvents>0);assert.equal(receipt.unboundAnimations,0);
 for(const animation of receipt.animations){if(receipt.reduced)assert.equal(animation.name,'none');else{assert.equal(animation.name,'mc-reported-event-arrival');assert.equal(animation.duration,'0.8s');assert.equal(animation.iterations,'1');}}
 return{mode:'new-report-motion',width,locale,...receipt};
}
