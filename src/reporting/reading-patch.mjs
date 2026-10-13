// Render into a detached tree, then reconcile keyed report content. Registered
// click handlers are renewed so retained buttons never hold an old report closure.
const handlers=new WeakMap();
export function readingDocument(doc){return new Proxy(doc,{get(target,key){if(key==='createElement')return(...args)=>{const n=target.createElement(...args),add=n.addEventListener.bind(n);n.addEventListener=(type,fn,options)=>{const list=handlers.get(n)||[];list.push({type,fn,options});handlers.set(n,list);add(type,fn,options);};return n;};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});}
const key=n=>n.nodeType===1?JSON.stringify([n.tagName,n.dataset.runControl,n.dataset.runSelection,n.dataset.disclosure,n.dataset.filePath,n.dataset.fileDirectory,n.dataset.reportArtifact,n.className]):'#text';
function patch(old,next){
 if(old.nodeType===3){if(old.data!==next.data)old.data=next.data;return;}
 const nextValue=next.tagName==='SELECT'?next.value:null;
 const wasOpen=old.tagName==='DETAILS'&&old.open;
 for(const a of [...old.attributes])if(!next.hasAttribute(a.name)&&a.name!=='open')old.removeAttribute(a.name);
 for(const a of [...next.attributes])if(a.name!=='open'&&old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);
 if(old.tagName==='DETAILS')old.open=wasOpen;
 // Keep native disclosure/focus/range state; only the current render owns handlers.
 for(const h of handlers.get(old)||[])old.removeEventListener(h.type,h.fn,h.options);
 const list=handlers.get(next)||[];for(const h of list)old.addEventListener(h.type,h.fn,h.options);handlers.set(old,list);
 patchReadingChildren(old,next);
 if(old.tagName==='SELECT')old.value=nextValue;
}
export function patchReadingChildren(host,next){
 const candidates=[...host.childNodes];let cursor=host.firstChild;
 for(const n of [...next.childNodes]){const match=candidates.find(o=>o.nodeType===n.nodeType&&key(o)===key(n));if(match){candidates.splice(candidates.indexOf(match),1);if(match!==cursor)host.insertBefore(match,cursor);patch(match,n);cursor=match.nextSibling;}else{host.insertBefore(n,cursor);}}
 for(const n of candidates)n.remove();
}
