function httpError(message,status){return Object.assign(new Error(message),{status});}
export function confirmPromotion(item,explicitDecision){
  if(!item.interpretation)throw httpError('Interpretation required before confirmation',409);
  if(item.interpretation.ambiguity||!item.interpretation.affectedEntity)throw httpError('Ambiguous entity must be resolved before confirmation',409);
  const decision=typeof explicitDecision==='string'?explicitDecision.trim().toLowerCase():'';
  if(!['要做','do it','approved'].includes(decision))throw httpError('Formal promotion requires an exact explicit Joey decision',409);
  return{state:'Ready to confirm',localProposalOnly:true,canonicalWritePerformed:false,confirmedAt:new Date().toISOString()};
}
