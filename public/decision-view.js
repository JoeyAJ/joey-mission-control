import {t,getLocale} from './i18n.js';
import {canonicalEvidence} from './control-semantics.js';
function text(doc,tag,value){const node=doc.createElement(tag);node.textContent=value;return node;}
export function decisionButton(project,item,onOpen,doc=document,locale=getLocale()){
 const button=text(doc,'button',t('control.decision',{},locale));button.dataset.decisionTarget=item.id;button.title=item.what;button.setAttribute('aria-controls',item.id);button.addEventListener('click',()=>onOpen(project,item));return button;
}
export function decisionPanel(project,item,doc=document,locale=getLocale()){
 const panel=doc.createElement('section');panel.id=item.id;panel.append(text(doc,'h4',t('decision.title',{},locale)));
 for(const [label,value] of [['decision.project',project.name?.value||project.id],['decision.what',item.what],['decision.why',item.why],['decision.source',item.source.sourcePath+' · '+item.source.sourceSection]])panel.append(text(doc,'p',t(label,{},locale)+': '+value));
 panel.tabIndex=-1;const status=text(doc,'p',t('decision.status',{},locale)+': ');status.append(decisionButton(project,item,()=>panel.focus(),doc,locale));panel.append(status);
 for(const [key,label] of [['lastAI','field.agent'],['model','field.model']])if(canonicalEvidence(project[key])&&project[key].value!=='Unknown')panel.append(text(doc,'p',t(label,{},locale)+': '+project[key].value));
 const evidence=doc.createElement('details');evidence.className='evidence';evidence.append(text(doc,'summary',t('decision.evidence',{},locale)),text(doc,'p',item.raw),text(doc,'p',JSON.stringify(item.source,null,2)));panel.append(evidence);return panel;
}
