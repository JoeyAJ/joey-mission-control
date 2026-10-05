// Presentation categories are evidence-backed; they never grant execution permission.
export function canonicalEvidence(claim){
 const s=claim?.source;
 return claim?.classification==='canonical'&&s?.classification==='canonical'&&Boolean(s.sourcePath)&&/^[a-f0-9]{64}$/i.test(s.fingerprint||'')&&/^(documented|verified(?:[_ -].*)?)$/i.test(s.verificationStatus||'');
}
export function missingOrUnverified(value){return /^(unknown|none recorded|not recorded|source unavailable|unavailable|unverified|awaiting verification|not yet (?:verified|derived|recorded)|no verified summary|尚未記錄|尚未驗證|來源無法取得|尚無已校對摘要|資料待補全|未知|尚未推導)[.。\s]*$/i.test(String(value||'').trim())||!String(value||'').trim();}
export function noAction(value){return /^(none|n\/a|no (?:action|decision|approval|blockers?) (?:required|needed|recorded)|no blockers?|no decisions pending|無|沒有|無需(?:行動|決策|批准)|不需要(?:行動|決策|批准))[.。\s]*$/i.test(String(value||'').trim());}
function explicitJoeyRequest(claim,type){
 if(!canonicalEvidence(claim)||missingOrUnverified(claim.value)||noAction(claim.value))return false;
 const value=String(claim.value);
 // Negation/satisfaction must refer to the requested action, not an option such as an approved provider.
 const inactive=/\bno\s+(?:Joey\s+)?(?:approval|authorization|confirmation|decisions?)\s+(?:(?:is|are)\s+)?(?:needed|required|pending)\b|\b(?:approval|authorization|confirmation|decision)\s+(?:(?:is|was|has been|has already been|already|is already)\s+)?(?:not\s+(?:needed|required)|unnecessary|obtained|received|granted|resolved|completed)\b|\bJoey\s+(?:has\s+(?:already\s+)?)?(?:approved|authorized|confirmed)\b|\bJoey\s+(?:is not required|does not need|need not|must not)\b|\b(?:approval|authorization|confirmation|decision).*pending verification\b|awaiting verification|not recorded|not yet verified|no verified summary|\bdecide later\b|\bdeferred\b|尚未記錄|尚未驗證|來源無法取得|尚無已校對摘要|資料待補全|之後再決定|已(?:批准|授權|確認)|不需要|無待決策/i;
 if(inactive.test(value))return false;
 if(type==='decision'&&/Decisions Needed From Joey/i.test(claim.source.sourceSection||''))return true;
 return /(?:Joey.*(?:approval|authorization|confirmation).*\b(?:required|needed|pending|awaiting)\b|(?:approval|authorization|confirmation|decision).*\b(?:required|needed|pending)\b.*Joey|(?:requires?|awaiting|await).*Joey.*(?:approval|authorization|confirmation)|blocked pending Joey|Joey\s+must\s+(?:choose|decide|approve|authorize|confirm|unblock)|等待\s*Joey.*(?:決策|批准|授權|確認)|需要\s*Joey.*(?:決策|批准|授權|確認))/i.test(value);
}

// A source phrase is only a candidate. Reasons and unresolved status must be explicit in the same verified record.
export function decisionItem(claim){
 if(!canonicalEvidence(claim))return null;
 const raw=String(claim.value||'');
 const field=name=>{const matches=[...raw.matchAll(new RegExp('(?:^|[|\\n])\\s*'+name+':\\s*([^|\\n]*)','gi'))];return matches.length===1?matches[0][1].trim():null;};
 const what=field('WHAT'),why=field('WHY'),status=field('STATUS')?.toLowerCase();
 const generic=/^(?:Joey\s+)?(?:approval|authorization|decision|confirmation)(?:\s+required)?[.。]*$/i;
 if(!what||!why||!['pending','unresolved','awaiting_joey'].includes(status)||[what,why].some(v=>missingOrUnverified(v)||noAction(v)||generic.test(v)||/尚無已校對摘要|unverified|not recorded/i.test(v)))return null;
 if(!/^(?:(?:Joey\s+(?:must|needs to)\s+)?(?:choose|decide|approve|authorize|confirm|select|reject)\b|(?:should|which|whether)\b.*\?|(?:請\s*|Joey\s*(?:必須|需要)\s*)?(?:決定|選擇|批准|授權|確認)|是否|哪一)/i.test(what))return null;
 if(!explicitJoeyRequest({...claim,value:what},'decision')||what.length<12||why.length<12)return null;
 return{what,why,status:'pending',source:claim.source,raw};
}
export function actionableDecision(claim){return Boolean(decisionItem(claim));}
export function verifiedDecisionItems(project){
 const claims=[...(project.management?.decisions||[]),...(project.management?.approvals||[]),...(project.blocker?[project.blocker]:[])];
 const seen=new Set(),items=[];
 for(const claim of claims){const item=decisionItem(claim);if(!item)continue;const key=item.source.sourcePath+'|'+item.raw;if(seen.has(key))continue;seen.add(key);items.push({...item,id:'joey-decision-'+encodeURIComponent(project.id)+'-'+item.source.fingerprint.slice(0,16)+'-'+items.length,claim});}
 return items;
}
