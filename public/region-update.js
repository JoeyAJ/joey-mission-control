import {brandEye} from './visual-system.js';
// Only real request state drives this border marker. No elapsed progress or telemetry.
export function mountRegionUpdate(region,{label='Updating source'}={}){
 const doc=region.ownerDocument,marker=doc.createElement('span');marker.className='region-update-marker';marker.setAttribute('aria-hidden','true');marker.append(brandEye(doc));region.append(marker);
 let active=false;return{set(value){active=value===true;region.dataset.regionUpdating=String(active);region.setAttribute('aria-busy',String(active));marker.title=label;},dispose(){active=false;delete region.dataset.regionUpdating;region.removeAttribute('aria-busy');marker.remove();}};
}
