import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const tests=fs.readdirSync('tests').filter(n=>n.endsWith('.test.mjs')).sort().map(n=>'tests/'+n);
for(const args of [['--test','--test-concurrency=1',...tests],['scripts/build.mjs'],['src/cli.mjs','validate'],['src/cli.mjs','check']]){
 const result=spawnSync(process.execPath,['--import','./tests/test-environment.mjs',...args],{stdio:'inherit'});
 if(result.status!==0){process.exitCode=result.status||1;break;}
}
