// Portable Owner intent only. No provider SDK, execution grant or credential.
export function ownerAgentSelection(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('OWNER_AGENT_SELECTION_INVALID');
 const field=key=>{const text=value[key];if(text===undefined||text===null||text==='')return null;if(typeof text!=='string'||text.length>128||/[\u0000-\u001f\u007f]/.test(text))throw Error('OWNER_AGENT_SELECTION_INVALID');return text.trim()||null;};
 return Object.freeze({qualification:'OWNER_SELECTION',agent:field('agent'),provider:field('provider'),model:field('model')});
}
