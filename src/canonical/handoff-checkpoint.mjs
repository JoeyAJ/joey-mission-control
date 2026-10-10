// The leading attributed handoff is current; subsequent records remain history.
// Never borrow missing current fields from a later preserved document.
export function currentHandoffDocument(text){
 const lines=text.split('\n');let title=false,header=false,fence=null,end=lines.length;
 for(let i=0;i<lines.length;i++){
  const line=lines[i],marker=line.match(/^\s*(`{3,}|~{3,})/);
  if(marker){if(!fence)fence=marker[1][0];else if(marker[1][0]===fence)fence=null;continue;}
  if(fence)continue;
  if(/^#\s+/.test(line)){if(title||header){end=i;break;}title=true;}
  if(/^Project:\s*\S/i.test(line))header=true;
  if(header&&/^##\s+(?:Preserved\b|Historical\b|History\b)/i.test(line)){end=i;break;}
 }
 return lines.slice(0,end).join('\n').replace(/\n(?:\s*---\s*\n?)+\s*$/,'').trim();
}
