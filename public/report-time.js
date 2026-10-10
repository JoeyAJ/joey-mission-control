// Report/event time in the viewer's timezone; original evidence is never rewritten.
export function reportTime(value,{locale='zh-TW',timeZone}={}){
 const date=new Date(value);if(typeof value!=='string'||!Number.isFinite(date.getTime()))return null;
 try{const zone=timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone;
 return{exact:value,zone,display:new Intl.DateTimeFormat(locale,{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).format(date)+' · '+zone};}catch{return null;}
}
export function reportTimeNode(doc,value,options){const v=reportTime(value,options),n=doc.createElement('time');if(v){n.dateTime=v.exact;n.title=v.exact;n.textContent=v.display;}else n.textContent='—';return n;}
