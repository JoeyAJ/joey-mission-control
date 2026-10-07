// Browser-only integrity calculation. No credentials, persistence or ambient IO.
function canonical(value,depth=0){
 if(depth>20)throw Error('CONTEXT_DEPTH');
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isSafeInteger(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';
 if(value&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
 throw Error('CONTEXT_JSON');
}
export async function browserContextDigest(value){
 const bytes=new TextEncoder().encode(canonical(value));if(bytes.length>262144)throw Error('CONTEXT_CAPACITY');
 return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
