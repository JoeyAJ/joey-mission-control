// Test-only builtin ports for the real bootstrap/PTY. No production hooks.
import fs from 'node:fs';import os from 'node:os';import crypto from 'node:crypto';import child from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';import path from 'node:path';
const home=process.env.MC_PTY_PREFLIGHT_HOME,native=path.join(home,'.local/lib/node_modules/@openai/codex/vendor/x86_64-unknown-linux-musl/bin/codex');
const lstat=fs.lstatSync,stat=fs.statSync,hash=crypto.createHash;
os.homedir=()=>home;os.userInfo=()=>({uid:process.getuid(),gid:process.getgid(),username:'fixture'});
fs.lstatSync=(p,...a)=>{const s=lstat(p,...a);if(p!==native)return s;const r=Object.assign(Object.create(Object.getPrototypeOf(s)),s);r.size=292309256;r.mode=0o100755;return r;};
fs.statSync=(p,...a)=>p.startsWith('/usr/bin/')?{uid:0,mode:0o100755,isFile:()=>true}:stat(p,...a);
crypto.createHash=(algorithm,...a)=>{const h=hash(algorithm,...a);let synthetic=false;return {update(value,...v){if(Buffer.from(value).toString()==='MC_PTY_SYNTHETIC_NATIVE')synthetic=true;else h.update(value,...v);return this;},digest(format){return synthetic&&algorithm==='sha256'?'9a820c17865fa825d04db416818679a9d63bd72e50835c396f496e5684626c9c':h.digest(format);}};};
child.spawnSync=(p,a,options)=>{
 if(options.env.NODE_OPTIONS||options.stdio[0]!=='ignore')throw Error('UNSAFE_TEST_PORT');
 if(p==='/usr/bin/node'&&a.join(' ')==='--version')return {status:0,stdout:'v22.20.0'};
 if(p==='/usr/bin/systemd-run'&&a.join(' ')==='--help')return {status:0,stdout:'--uid --gid --setenv --property --collect --no-ask-password'};
 if(p==='/usr/bin/sudo'&&a.join(' ')==='--version')return {status:0,stdout:'Sudo version 1.9.9'};
 if(p==='/usr/bin/sudo'&&a[0]==='-n'&&a[1]==='-l'&&a[2]==='-l')return process.env.MC_PTY_PREFLIGHT_DENY_SUDO==='1'?{status:1,stdout:''}:{status:0,stdout:'Options: !authenticate\nMatched: '+a.slice(4).join(' ')};
 if(p==='/usr/bin/systemctl'&&a.includes('is-system-running'))return {status:0,stdout:'running'};
 if(p==='/usr/bin/systemctl'&&a.includes('show'))return {status:1,stdout:'LoadState=not-found\nActiveState=inactive\n'};
 if(p==='/usr/bin/timedatectl')return {status:0,stdout:'yes'};
 throw Error('UNEXPECTED_SUBPROCESS');
};
syncBuiltinESMExports();
