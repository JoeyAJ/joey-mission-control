// Public display fallback is separate from private handoff/Owner authorization.
// Never request a public summary for a catalog-only private project.
const usableOwner=s=>s&&['active','reported','stale','missing'].includes(s.status);
export async function readTowerRunSources({projectIds,ownerRuns,readPublic}={}){
 const ids=[...new Set(projectIds)],missing=ids.filter(id=>!usableOwner(ownerRuns?.[id]));
 const publicRuns=missing.length?await Promise.resolve().then(()=>readPublic(missing)).catch(()=>null):null;
 const runs={...(ownerRuns||{})};
 for(const id of missing){const summary=publicRuns?.[id];if(summary?.qualification==='PUBLIC_READ_ONLY_RUN_SUMMARY')runs[id]=summary;}
 return {runs,publicRuns};
}
