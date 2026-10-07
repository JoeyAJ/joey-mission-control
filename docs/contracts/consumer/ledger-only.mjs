// Independent in-memory ledger restore: context not required; no writer or public route.
import {createHash} from 'node:crypto';import {validOwners} from '../../../src/product/model.mjs';
const validatedRestores=new WeakSet();
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function assertReadonlyLedgerRestore(r){if(!validatedRestores.has(r)||!Object.isFrozen(r)||r.readOnly!==true||r.authorityCutover!==false)throw Error('Use original immutable validated ledger restore result');return r;}
const hash=b=>createHash('sha256').update(b).digest('hex');
export function loadTwoLedgersReadonly({ownerBytes,inboxBytes,expected,synthetic=false,verifiedCustody=false}){
 if(!synthetic&&!verifiedCustody)throw Error('Official authorized Library byte custody must be verified first');
 for(const [name,b]of [['product-owner.v03.json',ownerBytes],['inbox.v1.json',inboxBytes]])if(!expected[name]||expected[name].bytes!==b.length||expected[name].sha256!==hash(b))throw Error('Ledger byte/hash mismatch');
 if(!synthetic&&(ownerBytes.length!==179558||inboxBytes.length!==2||inboxBytes.toString()!=='[]'))throw Error('Exact approved ledger scope mismatch');
 const owners=JSON.parse(ownerBytes),inbox=JSON.parse(inboxBytes);if(!validOwners(owners)||owners.length!==2||new Set(owners.map(o=>o.projectId)).size!==2||!owners.some(o=>o.projectId==='WOOSONG_BUDDY')||!owners.some(o=>o.projectId==='JOEY_ASSET_SYSTEM')||!Array.isArray(inbox)||inbox.length!==0)throw Error('Existing owner/inbox schema or project scope mismatch');
 const required={WOOSONG_BUDDY:{revision:3,auditCount:3,ideaCount:2,missionCount:5},JOEY_ASSET_SYSTEM:{revision:10,auditCount:10,ideaCount:1,missionCount:3}};
 const counts=owners.map(o=>({projectId:o.projectId,revision:o.revision,auditCount:o.canonicalState?.auditLog.length??null,ideaCount:o.canonicalState?.ideas.length??null,missionCount:o.canonicalState?.missions.length??null}));
 if(!synthetic&&counts.some(c=>Object.entries(required[c.projectId]).some(([k,v])=>c[k]!==v)))throw Error('Parent approved owner revision/reference-count receipt mismatch');
 const result=freeze({readOnly:true,authorityCutover:false,synthetic,verifiedCustody:!synthetic&&verifiedCustody,hashValidation:true,schemaReferenceValidation:true,counts,inboxCount:0,privateState:{owners,inbox},noIndependentMissionOrProposalLedgerRequired:true});validatedRestores.add(result);return result;
}
