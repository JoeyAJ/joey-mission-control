// Existing system identity, not a new registry entry or an authorization grant.
const repo='https://github.com/JoeyAJ/joey-mission-control';
export function withMissionControlProject(projects=[]){
 if(projects.some(p=>p.id==='MISSION_CONTROL'))return projects;
 return [...projects,{id:'MISSION_CONTROL',name:'Mission Control',status:'Active',siteUrl:'https://joey-mission-control-one.vercel.app/#joey'}];
}
const labels={
 'zh-TW':['程式碼倉庫 · main','最新交接 · main','已開發功能與驗證狀態','下一階段開發事項'],
 en:['Repository · main','Latest handoff · main','Features and verification','Next development phase'],
 ko:['저장소 · main','최신 인계 · main','기능 및 검증 상태','다음 개발 단계']
};
export function missionControlLinks(locale='en'){
 const paths=['tree/main','blob/main/HANDOFF.md','blob/main/docs/MC_FEATURE_INVENTORY.md','blob/main/docs/MC_NEXT_PHASE.md'];
 return (labels[locale]||labels.en).map((label,i)=>[label,repo+'/'+paths[i]]);
}
export function missionControlTakeover(instruction){
 return ['MC application development: canonical branch is main. Fresh-read origin/main, AGENT_CONTROL.md section B, HANDOFF.md, docs/MC_FEATURE_INVENTORY.md and docs/MC_NEXT_PHASE.md before work.',
 'The verified report packet below uses the legacy checkpoint source scope. It is reporting context, not the current application baseline. Preserve its binding for reports; never deploy the legacy checkpoint over main or change report permissions implicitly.',instruction].join('\n\n');
}
