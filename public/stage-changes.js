// Historical comparison only. Rendering uses text nodes; never HTML or raw downloads.
const words={
 'zh-TW':{title:'已確認變更 · Explorer',history:'歷史 Git 比較，不是當前工具事件',safe:'公開安全摘要；私人原始碼與 diff 不公開',files:'變更檔案',compare:'比較版本',unavailable:'Diff 未取得或超出限制；保留來源版本',truncated:'顯示受限節錄，未顯示全部 diff',read:'Consumer 讀取時間',source:'提交時間'},
 en:{title:'Confirmed changes · Explorer',history:'Historical Git comparison, not current tool events',safe:'Safe public summary; private source and diffs are withheld',files:'Changed files',compare:'Compare versions',unavailable:'Diff unavailable or exceeds limit; source versions retained',truncated:'Bounded excerpt; full diff is not displayed',read:'Consumer read time',source:'Commit time'},
 ko:{title:'확인된 변경 · Explorer',history:'과거 Git 비교, 현재 도구 이벤트 아님',safe:'공개 안전 요약. 비공개 소스와 diff는 제공하지 않음',files:'변경 파일',compare:'버전 비교',unavailable:'Diff 없음 또는 제한 초과. 출처 버전 유지',truncated:'제한된 발췌. 전체 diff 아님',read:'Consumer 읽기 시간',source:'커밋 시간'}
};
export function renderStageChanges(view,{doc=document,locale='zh-TW',item=null,onNavigate=()=>{}}={}){
 const w=words[locale]||words['zh-TW'],el=(tag,text)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=String(text);return n;},box=el('details');box.className='command-changes';box.dataset.stageChanges=view.privateContent?'private':'safe';box.open=(item||'').startsWith('stage-');box.append(el('summary',w.title),el('p',w.history),el('p',view.range.from+' → '+view.range.to));
 if(view.sourceTime)box.append(el('p',w.source+' · '+view.sourceTime));if(view.readAt)box.append(el('p',w.read+' · '+view.readAt));
 const overview=el('button',w.compare);overview.type='button';overview.dataset.stageCompare='overview';overview.addEventListener('click',()=>onNavigate('stage-overview'));box.append(overview);
 if(!view.privateContent){box.append(el('p',w.safe),el('p',w.files+' · '+view.summary.changedFiles),el('p',view.summary.areas.join(' / ')));if(view.privateCapabilities){const labels={en:'Validated in private local mode: historical comparison, task observation snapshot, read-only handoff. Private data is withheld here; cloud private transport is not enabled.','zh-TW':'私人本機已驗證：歷史比較、任務觀察 snapshot、唯讀接手上下文。此處不提供私人資料；cloud private transport 尚未啟用。',ko:'비공개 로컬 검증: 과거 비교, 작업 관찰 스냅샷, 읽기 전용 인계. 이 페이지는 비공개 데이터를 제공하지 않으며 cloud private transport는 활성화되지 않음.'};box.append(el('p',labels[locale]||labels['zh-TW']));}return box;}
 const explorer=el('nav');explorer.setAttribute('aria-label',w.files);explorer.className='command-file-tabs';for(const f of view.files){const b=el('button',f.status+' · '+f.path.split('/').at(-1));b.type='button';b.dataset.stageFile=f.id;b.title=f.path;b.setAttribute('aria-label',f.status+' · '+f.path);b.setAttribute('aria-pressed',String(item===f.id));b.addEventListener('click',()=>onNavigate(f.id));explorer.append(b);}box.append(explorer);
 const selected=view.files.find(f=>f.id===item);if(selected){const detail=el('section');detail.dataset.stageInspector=selected.id;const path=el('h4',selected.path);path.className='command-file-breadcrumb';detail.append(path);if(selected.availability!=='AVAILABLE')detail.append(el('p',w.unavailable));else{if(selected.truncated)detail.append(el('p',w.truncated));const pre=el('pre');pre.className='command-diff';for(const row of stageDiffRows(selected.diff)){const n=el('span',row.text);n.className='command-diff-line';n.dataset.diffKind=row.kind;n.dataset.oldLine=row.oldLine;n.dataset.newLine=row.newLine;pre.append(n);}detail.append(pre);}box.append(detail);}return box;
}

// Numbers come only from valid unified-diff hunks; exact source text is preserved.
export function stageDiffRows(diff){
 let oldLine=null,newLine=null;const lines=diff.split('\n');
 return lines.map((line,index)=>{let kind='metadata',old='',next='';const hunk=line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if(hunk){oldLine=Number(hunk[1]);newLine=Number(hunk[2]);}
  else if(line.startsWith('diff --git ')||line.startsWith('@@')){oldLine=null;newLine=null;}
  else if(oldLine!==null&&newLine!==null){if(line.startsWith('+')){kind='added';next=String(newLine++);}else if(line.startsWith('-')){kind='removed';old=String(oldLine++);}else if(line.startsWith(' ')){kind='context';old=String(oldLine++);next=String(newLine++);}}
  return{text:line+(index<lines.length-1?'\n':''),kind,oldLine:old,newLine:next};
 });
}

const graphWords={
 'zh-TW':{title:'MC · 固定歷史比較',membership:'比較範圍與檔案歸屬；不是依賴分析或即時檔案操作',summary:'公開比較摘要；檔案名稱與 diff 已隱藏',unknown:'來源未記錄'},
 en:{title:'MC · fixed historical comparison',membership:'Comparison membership; not dependencies or current file operations',summary:'Public comparison summary; filenames and diffs withheld',unknown:'Not recorded by source'},
 ko:{title:'MC · 고정 과거 비교',membership:'비교 범위와 파일 소속. 의존성 분석이나 현재 파일 작업 아님',summary:'공개 비교 요약. 파일 이름과 diff는 제공하지 않음',unknown:'출처 기록 없음'}
};
// Uses only the already loaded comparison. Edges represent membership, never inferred imports.
export function renderStageChangeGraph(view,{doc=document,locale='zh-TW',item=null,onNavigate=()=>{}}={}){
 const w=words[locale]||words['zh-TW'],g=graphWords[locale]||graphWords['zh-TW'];
 const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n;};
 const button=(label,id)=>{const n=el('button',label,'command-graph-node');n.type='button';n.addEventListener('click',()=>onNavigate(id));return n;};
 const box=el('section',null,'command-graph');box.dataset.graphScope=view.privateContent?'mc-historical-comparison':'mc-historical-summary';
 const count=view.privateContent?view.files.length:view.summary?.changedFiles;
 box.append(el('h4',g.title),el('small',g.membership),el('small',view.range.from.slice(0,7)+' → '+view.range.to.slice(0,7)+' · '+w.files+' · '+(Number.isInteger(count)?count:g.unknown)));
 if(!view.privateContent)box.append(el('small',g.summary));
 const canvas=el('div',null,'command-graph-canvas'),svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','command-graph-lines');canvas.append(svg);
 const line=(x1,y1,x2,y2,selected=false)=>{const n=doc.createElementNS('http://www.w3.org/2000/svg','line');for(const [k,v]of Object.entries({x1,y1,x2,y2}))n.setAttribute(k,String(v));if(selected)n.setAttribute('class','is-selected');svg.append(n);};
 const place=(n,x,y)=>{n.style.left=x+'%';n.style.top=y+'%';canvas.append(n);};
 const root=button('MC','stage-overview');root.dataset.graphCompare='stage-overview';root.title=g.title;root.setAttribute('aria-label',g.title+' · '+w.compare);place(root,12,50);
 if(view.privateContent){
  const groups=new Map();for(const f of view.files){const group=f.path.split('/')[0];if(!groups.has(group))groups.set(group,[]);groups.get(group).push(f);}
  let index=0;const total=view.files.length;
  for(const [name,files]of groups){const first=index,last=index+files.length-1,y=total===1?50:10+80*(first+last)/2/(total-1),selected=files.some(f=>f.id===item);line(12,50,36,y,selected);place(el('span',name,'command-graph-group'),36,y);
   for(const f of files){const fy=total===1?50:10+80*index/(total-1),active=f.id===item;line(36,y,74,fy,active);const n=button(f.status+' · '+f.path.split('/').at(-1),f.id);n.dataset.graphFile=f.id;n.title=f.path;n.setAttribute('aria-label',f.status+' · '+f.path);n.setAttribute('aria-pressed',String(active));place(n,74,fy);index++;}
  }
  canvas.style.minHeight=Math.max(160,total*48)+'px';
 }else{
  const areas=view.summary?.areas||[];areas.forEach((area,index)=>{const y=areas.length===1?50:14+72*index/(areas.length-1);line(12,50,71,y);const n=button(area,'stage-overview');n.dataset.graphArea=String(index);place(n,71,y);});canvas.style.minHeight=Math.max(150,areas.length*45)+'px';
 }
 box.append(canvas);return box;
}
