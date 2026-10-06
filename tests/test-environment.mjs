import './helpers/fixtures.mjs';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import childProcess from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
// A hard read boundary makes accidental workstation dependencies fail the suite.
const forbidden=['/Users/joeyaj/JOEY_CANONICAL_MEMORY','/Users/joeyaj/Documents/Codex/Projects','/Users/joeyaj/Library/Application Support/JoeyMissionControl'];
let denied=0;
function guard(value){if(typeof value==='number'||value==null)return;const p=path.resolve(value instanceof URL?fileURLToPath(value):String(value));if(forbidden.some(root=>p===root||p.startsWith(root+'/'))){denied++;throw new Error('Portable test attempted workstation source access');}}
for(const object of [fs,fs.promises])for(const name of ['readFile','readFileSync','open','openSync','readdir','readdirSync','stat','statSync','lstat','lstatSync','realpath','realpathSync','access','accessSync','copyFile','copyFileSync'])if(typeof object[name]==='function'){const original=object[name];object[name]=function(file,...args){guard(file);if(name.startsWith('copyFile'))guard(args[0]);return original.call(this,file,...args);};}
const guardOptions=args=>{for(const arg of args)if(arg&&typeof arg==='object'&&!Array.isArray(arg)&&arg.cwd)guard(arg.cwd);};
for(const name of ['execFile','execFileSync','spawn','spawnSync','exec','execSync']){const original=childProcess[name];const wrapped=function(...args){guardOptions(args);return original.apply(this,args);};if(original[promisify.custom])wrapped[promisify.custom]=function(...args){guardOptions(args);return original[promisify.custom].apply(this,args);};childProcess[name]=wrapped;}
syncBuiltinESMExports();
process.on('exit',()=>{process.stdout.write(`PORTABILITY_GUARD forbiddenAttempts=${denied}\n`);if(denied){process.stderr.write(`PORTABILITY GUARD: ${denied} forbidden attempts\n`);process.exitCode=1;}});
