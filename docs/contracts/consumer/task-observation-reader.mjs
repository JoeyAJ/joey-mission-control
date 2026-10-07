// Reads one explicitly supplied isolated receipt store. No platform API/session paths.
import fs from 'node:fs/promises';import path from 'node:path';
import {inspectTaskObservations} from '../task-observation.mjs';
export async function readTaskObservation({root,readAt}){
 if(!path.isAbsolute(root)||path.resolve(root)!==root||!['/workspace','/tmp'].includes(path.dirname(root))||!/^mc-task-observation-candidate(?:-|$)/.test(path.basename(root))||await fs.realpath(root)!==root)throw Error('Isolated observation root required');
 const p=path.join(root,'task-observations.v1.json');if((await fs.lstat(p)).isSymbolicLink())throw Error('Observation symlink rejected');
 const handle=await fs.open(p,'r');try{const b=Buffer.alloc(65537),{bytesRead}=await handle.read(b,0,b.length,0);if(bytesRead>65536)throw Error('Observation size exceeded');return inspectTaskObservations(JSON.parse(b.subarray(0,bytesRead).toString('utf8')),readAt);}finally{await handle.close();}
}
