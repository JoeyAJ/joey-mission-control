// Storage integrity rule shared with the pending SQL parity fixtures. No fetch.
const host='(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?';
const pattern=new RegExp('^https://('+host+')(?::([1-9][0-9]{0,4}))?/([A-Za-z0-9._~!$&\'()*+,;=:@/%-]*)$');
export function canonicalDraftPreviewUrl(v){
 if(v==='')return true;const m=pattern.exec(v);if(!m||m[1].length>253||m[2]&&(Number(m[2])>65535||Number(m[2])===443)||/%(?![a-fA-F0-9]{2})/.test(m[3])||/(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(m[3]))return false;
 try{return new URL(v).href===v;}catch{return false;}
}
