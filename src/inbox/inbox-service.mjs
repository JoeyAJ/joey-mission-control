import { createHash, randomUUID } from 'node:crypto';
const norm=value=>value.trim().toLowerCase().replace(/\s+/g,' ');
const transitions={'Needs review':['Resolved'],'Ready to confirm':['In progress','Resolved'],'In progress':['Resolved'],Resolved:['Needs review']};
const httpError=(message,status)=>Object.assign(new Error(message),{status});

export class InboxService{
  constructor(store){this.store=store;}
  async capture({rawText,entityHint,type='Request'}){
    if(!['Request','Decision','Notice','Problem'].includes(type))throw Object.assign(new Error('Invalid Inbox type'),{status:400});
    if(!rawText?.trim())throw Object.assign(new Error('Raw text required'),{status:400});
    const key=createHash('sha256').update(norm(rawText)).digest('hex');
    let result;
    await this.store.update(all=>{
      const existing=all.find(item=>item.idempotencyKey===key&&Date.now()-Date.parse(item.createdAt)<86400000);
      if(existing){result=existing;return all;}
      const createdAt=new Date().toISOString();
      result={schemaVersion:'1.0',id:randomUUID(),rawText,type,state:'Needs review',createdAt,idempotencyKey:key,...(entityHint?{entityHint}:{})};
      return[...all,result];
    });
    return result;
  }
  async get(id){return(await this.store.read()).find(item=>item.id===id);}
  async update(id,fn){let result;await this.store.update(items=>items.map(item=>item.id===id?(result=fn(item)):item));if(!result)throw Object.assign(new Error('Inbox item not found'),{status:404});return result;}
  async list(){return this.store.read();}
  async transition(id,state,expectedState){
    return this.update(id,item=>{
      if(expectedState!==undefined&&expectedState!==item.state)throw httpError('Inbox state changed; reload before updating',409);
      if(!transitions[item.state]?.includes(state))throw httpError(`Invalid Inbox transition ${item.state} -> ${state}`,409);
      if(state==='In progress'&&(!item.confirmedAt||!item.localProposalOnly||item.canonicalWritePerformed!==false||!item.interpretation?.affectedEntity||item.interpretation.ambiguity))throw httpError('Local proposal confirmation required before progress',409);
      const result={...item,state,updatedAt:new Date().toISOString()};
      if(state==='Needs review')for(const key of ['interpretation','confirmedAt','localProposalOnly','canonicalWritePerformed'])delete result[key];
      return result;
    });
  }
}
