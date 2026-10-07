// Offline scope substitution only; no DB/client/credential access.
import {createHash} from 'node:crypto';
const projects=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'];
export function prepareCoordinatorSql({template,ownerSubject,epoch,heads,contexts,approvalRef}={}){
 if(typeof template!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(ownerSubject||'')||!/^import_[a-f0-9]{32}$/.test(epoch||'')||!/^MC_P3_[A-Za-z0-9_]{1,100}$/.test(approvalRef||'')||!Array.isArray(heads)||!Array.isArray(contexts)||heads.length!==4||contexts.length!==4)throw Error('P3_SQL_SCOPE');
 const scope=projects.map(project_id=>{const h=heads.filter(x=>x.projectId===project_id),c=contexts.filter(x=>x.projectId===project_id);if(h.length!==1||c.length!==1||h[0].epoch!==epoch||h[0].revision!==0||h[0].writesEnabled!==false||!/^[a-f0-9]{40}$/.test(h[0].baselineSha)||!/^[a-f0-9]{64}$/.test(c[0].contextHash))throw Error('P3_SQL_SCOPE');return{project_id,epoch,baseline_sha:h[0].baselineSha,context_hash:c[0].contextHash};});
 const sql=template.replaceAll('@@SCOPE@@',JSON.stringify(scope)).replaceAll('@@OWNER@@',ownerSubject).replaceAll('@@APPROVAL@@',approvalRef);
 if(/@@[A-Z]+@@/.test(sql)||!sql.startsWith('-- Offline template.'))throw Error('P3_SQL_TEMPLATE');
 return{sql,sha256:createHash('sha256').update(sql).digest('hex'),scope};
}
