import {prepareTaskHandoffReview} from '../tasks/task-handoff-review.mjs';
import {createTaskReconciliationClient} from '../tasks/task-reconciliation-client.mjs';
import {createTaskReviewClient} from '../tasks/task-review-client.mjs';
import {createTaskReviews} from '../tasks/task-review-controller.mjs';
import {mountRemoteHandoffTransport} from '../continuity/remote-handoff-transport-view.mjs';
import {createRemoteHandoffClient} from '../continuity/remote-handoff-client.mjs';
import {mountRepositoryRunTransport} from '../reporting/repository-run-view.mjs';
import {createRepositoryRunClient} from '../reporting/repository-run-client.mjs';
import {createDevelopmentTasks} from '../tasks/development-task-controller.mjs';
import {createTaskStorageClient} from '../tasks/task-storage-client.mjs';
import {mountDevelopmentTask} from '../tasks/development-task-view.mjs';
import {assertProjectScope} from './project-scope-authority.mjs';
// Same actual source/report transports and task form as existing projects. No
// direct Agent executor, closure/merge action or fabricated database membership.
export function mountAuthorizedProjectEntry({doc=document,connection,ownerSubject,inspectIdentity,getAccessToken,fetchImpl=globalThis.fetch,origin=globalThis.location?.origin,locale='zh-TW'}={}){
 const {projectId,scopeAuthority}=connection;assertProjectScope(scopeAuthority,projectId,'BASELINE','source');
 const root=doc.createElement('details');root.id='owner-workspace-access';root.dataset.dynamicProject='true';root.dataset.ownerAuth='verified';root.dataset.ownerAal='aal2';root.append(doc.createElement('summary'));root.firstChild.textContent='Owner · '+projectId;
 const identity=async()=>{const actor=await inspectIdentity('NEXAEON');assertProjectScope(scopeAuthority,projectId,'BASELINE','source');return actor;};
 const source=mountRemoteHandoffTransport({doc,projectId,ownerSubject,inspectIdentity:identity,client:createRemoteHandoffClient({getAccessToken,fetchImpl,origin}),locale,initiallyEnabled:false});
 const reports=mountRepositoryRunTransport({doc,projectId,ownerSubject,inspectIdentity:identity,client:createRepositoryRunClient({getAccessToken,fetchImpl,origin}),locale});
 const reviewClient=createTaskReviewClient({getAccessToken,fetchImpl,origin,scopeAuthority,projectId});
 const controller=createDevelopmentTasks({prepareReview:(packet,options)=>prepareTaskHandoffReview(packet,reviewClient,{scopeAuthority,...options}),projectId,ownerSubject,inspectIdentity:identity,scopeAuthority,source,reports,client:createTaskStorageClient({getAccessToken,fetchImpl,origin,scopeAuthority,projectId}),reconciliationClient:createTaskReconciliationClient({getAccessToken,fetchImpl,origin,scopeAuthority,projectId})});
 const reviews=createTaskReviews({tasks:controller,source,reports,scopeAuthority,client:reviewClient});
 const task=mountDevelopmentTask({doc,locale,controller,reviewController:reviews,requireSignIn:()=>root.dataset.ownerAuth==='verified',getAuthState:()=>root.dataset.ownerAuth});
 root.sourceController=source;root.remoteHandoffSource=source.root;root.repositoryRunsController=reports;root.repositoryRunsSource=reports.root;root.developmentTaskSource=task.root;root.taskController=controller;root.reviewController=reviews;root.prepareContinuation=()=>source.prepareContinuation();
 root.update=next=>{if(next.locale){task.update({locale:next.locale,projectId,track:'BASELINE'});source.update({locale:next.locale});reports.update({locale:next.locale});}};
 root.dispose=()=>{root.dataset.ownerAuth='unconfigured';task.dispose();controller.dispose();source.dispose();reports.dispose();};
 source.update({enabled:true,projectId,track:'BASELINE'});reports.update({enabled:true,projectId,track:'BASELINE'});return root;
}
