import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256 } from '../canonical/fingerprint.mjs';

const commands=[['rev-parse','--show-toplevel'],['branch','--show-current'],['rev-parse','HEAD'],['remote','get-url','origin'],['rev-parse','--abbrev-ref','--symbolic-full-name','@{u}'],['status','--porcelain=v1','--branch']];
const unmerged=new Set(['DD','AU','UD','UA','DU','AA','UU']);
export function classifyPorcelain(lines){const kinds=[];if(lines.some(line=>line.startsWith('??')))kinds.push('untracked');const tracked=lines.filter(line=>!line.startsWith('??'));if(tracked.length)kinds.push(tracked.some(line=>unmerged.has(line.slice(0,2)))?'conflicted':'modified');return kinds.join('+')||'clean';}
function run(cwd,args,optional=false){const result=spawnSync('git',args,{cwd,encoding:'utf8',shell:false,timeout:5000});if(result.status!==0&&!optional)throw new Error(`Git observation failed: ${result.stderr.trim()}`);return result.stdout.trim();}

export function observeGit(repoPath,allowedRoots){
  if(!fs.existsSync(repoPath))throw new Error('Missing path');
  const real=fs.realpathSync(repoPath);
  const allowed=allowedRoots.filter(root=>fs.existsSync(root)).map(root=>fs.realpathSync(root));
  if(!allowed.some(root=>real===root||real.startsWith(root+path.sep)))throw new Error('Path not allowlisted');
  const top=run(real,commands[0]);
  if(fs.realpathSync(top)!==real)throw new Error('Git root/realpath mismatch');
  const branch=run(real,commands[1]),head=run(real,commands[2]),origin=run(real,commands[3],true),upstream=run(real,commands[4],true),status=run(real,commands[5]);
  const lines=status.split('\n').slice(1).filter(Boolean);
  const aheadBehind=status.match(/\[ahead (\d+)(?:, behind (\d+))?|\[behind (\d+)/);
  const observedAt=new Date().toISOString();
  const facts={path:real,branch,head,origin,upstream,ahead:Number(aheadBehind?.[1]||0),behind:Number(aheadBehind?.[2]||aheadBehind?.[3]||0),dirtyState:classifyPorcelain(lines)};
  const observationFingerprint=sha256(JSON.stringify(facts));
  return {...facts,observedAt,observationFingerprint,source:{classification:'observed',sourcePath:real,sourceSection:'Git observation',fingerprint:observationFingerprint,verificationStatus:'observed',readAt:observedAt}};
}
