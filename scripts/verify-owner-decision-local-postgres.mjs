// Isolated PostgreSQL WASM fixtures: no Auth, SDK, DB or network connection.
// Pin @electric-sql/pglite@0.3.15 outside the product dependencies; pass its module path.
import fs from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const modulePath=process.argv[2];if(!modulePath)throw Error('PINNED_LOCAL_POSTGRES_MODULE_REQUIRED');
const {PGlite}=await import(pathToFileURL(modulePath)),db=new PGlite();
const generated=spawnSync(process.execPath,['scripts/prepare-owner-decision-fixture.mjs','--local'],{encoding:'utf8'});assert.equal(generated.status,0);
try{
 const foundation=await fs.readFile('docs/contracts/sql/private-continuity.foundation.sql','utf8');
 const helper=foundation.slice(foundation.indexOf('CREATE FUNCTION mc_private.canonical_json'),foundation.indexOf('CREATE FUNCTION mc_private.read_head'));
 // Select only these exact helper definitions, not the foundation tables or grants.
 const functions=helper.match(/CREATE FUNCTION mc_private\.(?:canonical_json|exact_keys)[\s\S]*?\$\$;/g);assert.equal(functions?.length,2);
 await db.exec('CREATE ROLE mc_continuity_executor NOLOGIN;CREATE SCHEMA mc_private;GRANT USAGE ON SCHEMA mc_private TO mc_continuity_executor;'+functions.join('\n'));
 const fixture=await fs.readFile('/tmp/mc-private-restore/receipts/owner-decision.synthetic.local.rollback.sql','utf8'),result=await db.exec(fixture);
 assert(result.some(r=>r.rows?.[0]?.cas_replay_expiry_quota_denial_readback_pass===true));
 const state=await db.query("SELECT to_regclass('pg_temp.coordinator_owner_decisions') IS NULL AS rolled_back,EXISTS(SELECT 1 FROM pg_auth_members a WHERE a.roleid='mc_continuity_executor'::regrole AND a.member='postgres'::regrole) AS residue");assert.equal(state.rows[0].rolled_back,true);assert.equal(state.rows[0].residue,false);
 const evidence={pass:true,syntheticOnly:true,engine:'@electric-sql/pglite@0.3.15',actualSupabaseRuntimeVerified:false,authTablesAccessed:false,liveRequests:0,fixtureProjects:4,checks:['AAL1 refusal','revoked synthetic session refusal','membership refusal','immutable append','original revision/time exact replay','expired prior replay','changed-content refusal','stale second-device CAS','immutable final refusal','shared quota refusal','changed evidence refusal','expired new decision refusal','four project readback','shared budget count','rollback and no temporary SET residue']};
 await fs.writeFile('/workspace/mc-deliverables/owner-decision-local-postgres.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}catch(e){console.error(JSON.stringify({pass:false,syntheticOnly:true,code:e.code||null,message:e.message}));process.exitCode=1;}finally{await db.close();}
