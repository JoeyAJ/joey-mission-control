import path from 'node:path';
import {loadMemoryIndex} from '../canonical/index-adapter.mjs';
import {loadRegistry} from '../canonical/registry-adapter.mjs';
import {loadEntityMemory} from '../canonical/memory-adapter.mjs';
import {loadHandoffs} from '../canonical/handoff-adapter.mjs';
import {buildProjectProjection} from './project-projection.mjs';
import {observeGit} from '../workspace/git-observer.mjs';

function memoryDirectory(memoryPath){return path.posix.dirname(memoryPath);}
function relevantDocs(entity){const dir=memoryDirectory(entity.memoryPath);return[entity.currentStatePath,`${dir}/NEXT_ACTIONS.md`,`${dir}/DECISIONS.md`].filter(Boolean);}
function newestSession(sessions,id){return sessions.filter(session=>session.entityId===id).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0];}

export async function buildProjection(root,{sessions=[]}={}){
  const [index,registry]=await Promise.all([loadMemoryIndex(root),loadRegistry(root)]);
  const knownEntities=new Set(index.entities.map(entity=>entity.id));
  const handoffs=await loadHandoffs(`${root}/HANDOFF`,{knownEntities});
  const chains=[...registry.production,...registry.systems];
  const allowedRoots=chains.map(chain=>chain.localMaster).filter(Boolean);
  const observations=new Map();
  for(const chain of chains){
    try{observations.set(chain.id,observeGit(chain.localMaster,allowedRoots));}
    catch(error){observations.set(chain.id,{error:error.message,observedAt:new Date().toISOString()});}
  }
  const cases=[];
  for(const entity of index.entities.filter(item=>item.entityType==='case')){
    const memory=await loadEntityMemory(root,memoryDirectory(entity.memoryPath));
    const parentChain=chains.find(chain=>chain.id===entity.parentId)||{};
    cases.push(buildProjectProjection({id:entity.id,name:entity.name,entityType:'case',parentId:entity.parentId,indexSource:index.source,memoryPath:entity.memoryPath,relevantDocs:relevantDocs(entity),state:memory.CURRENT_STATE,next:memory.NEXT_ACTIONS,registry:parentChain,handoff:handoffs.byEntity[entity.id],handoffConflicts:handoffs.conflictsByEntity[entity.id]||[],session:newestSession(sessions,entity.id),git:observations.get(entity.parentId)||{error:'Parent workspace unavailable',observedAt:new Date().toISOString()}}));
  }
  const projects=[];
  for(const entity of index.entities.filter(item=>item.entityType!=='case')){
    const memory=await loadEntityMemory(root,memoryDirectory(entity.memoryPath));
    const chain=chains.find(item=>item.id===entity.id)||{};
    projects.push(buildProjectProjection({id:entity.id,name:entity.name,entityType:entity.entityType,indexSource:index.source,memoryPath:entity.memoryPath,relevantDocs:relevantDocs(entity),state:memory.CURRENT_STATE,next:memory.NEXT_ACTIONS,registry:chain,handoff:handoffs.byEntity[entity.id],handoffConflicts:handoffs.conflictsByEntity[entity.id]||[],session:newestSession(sessions,entity.id),git:observations.get(entity.id)||{error:'Workspace registry entry missing',observedAt:new Date().toISOString()},cases:cases.filter(item=>item.parentId===entity.id)}));
  }
  return{schemaVersion:'1.0',generatedAt:new Date().toISOString(),projects,cases,handoffs};
}
