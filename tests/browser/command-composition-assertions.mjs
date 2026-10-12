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

export async function assertToolbarBoundary(page){
 const receipt=await page.evaluate(()=>{const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};},head=document.querySelector('.command-workspace-head');return {viewport:innerWidth,head:box(head),focus:box(document.querySelector('.command-focus')),owner:box(document.querySelector('.command-owner-access')),children:[...head.children].filter(n=>n.getBoundingClientRect().height>0).map(box)};});
 assert(receipt.head.right<=receipt.owner.left+1,JSON.stringify(receipt));assert(receipt.head.bottom<=receipt.focus.top+1,JSON.stringify(receipt));for(const child of receipt.children){assert(child.left>=receipt.head.left-1&&child.right<=receipt.head.right+1,JSON.stringify(receipt));assert(child.top>=receipt.head.top-1&&child.bottom<=receipt.head.bottom+1&&child.bottom<=receipt.focus.top+1,JSON.stringify(receipt));}return receipt;
}
