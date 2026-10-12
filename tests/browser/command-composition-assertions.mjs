import assert from 'node:assert/strict';
export async function assertCommandComposition(page,width){
 const receipt=await page.evaluate(()=>{
  const box=selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
  return{viewport:innerWidth,left:box('.command-projects'),events:box('.command-events'),files:box('.command-layout>.command-explorer'),right:box('.command-context'),taskFont:parseFloat(getComputedStyle(document.querySelector('.run-focus-heading .selected-task-title')).fontSize),overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 assert.equal(receipt.overflow,false);
 if(width>768){assert(receipt.events.width>receipt.right.width*1.5);assert(receipt.events.x>receipt.left.x);assert(Math.abs(receipt.events.x-receipt.files.x)<2);assert(receipt.files.y>receipt.events.y);assert(receipt.right.x>receipt.events.x);assert(receipt.taskFont>=20);}
 else assert(receipt.taskFont>=18);
 return receipt;
}
