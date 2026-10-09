// Server-only fixed repository/ref/path scope. Credentials remain in normal runtime.
const base={legacyPath:null,entryQualification:'DOCUMENTED_BASELINE_ENTRY',executionAuthorized:false};
const records={
 NEXAEON:{...base,projectId:'NEXAEON',repositoryId:'JoeyAJ/nexaeon-web',ref:'main',path:'README.md',expectedBaseline:'8271e1bbae78eb7fc4fc86c06feaa50d6fa82c39',contextPaths:['docs/development-history/README.md','docs/STAGE_5_2_ACCEPTANCE.md','docs/architecture/ADR-0054-n8n-tool-runtime.md','docs/STAGE_5_4_B_EXPLORER_N8N_CONFIGURATION.md']},
 WOOSONG_BUDDY:{...base,projectId:'WOOSONG_BUDDY',repositoryId:'JoeyAJ/woosongbuddy',ref:'main',path:'README.md',expectedBaseline:'e41bd1b7d8a481fdf6402881f382605278d229af',contextPaths:['AGENTS.md','CLAUDE.md','docs/RELEASE_20261006.md','docs/THEME_PUBLIC_TEST_RELEASE_20261006.md']},
 NAMYOUNG_WEB3D:{...base,projectId:'NAMYOUNG_WEB3D',repositoryId:'JoeyAJ/namyoung-web3d',ref:'main',path:'README.md',expectedBaseline:'92c17b8adeec5eaa80d27b8facad532e6ff61d59',contextPaths:['docs/PRODUCTION_REBUILD.md']},
 JOEY_ASSET_SYSTEM:{...base,projectId:'JOEY_ASSET_SYSTEM',repositoryId:'JoeyAJ/joey-asset-system',ref:'main',path:'README.md',expectedBaseline:'eb03e2a9d86abf8b53acfe207fb6737d255ba0d4',contextPaths:['SYSTEM_CHARTER.md','cases/CASE_001_NAMYOUNG/README.md','provenance/CASE_001_NAMYOUNG_RECOVERY.md']}
};
const university={...base,projectId:'JOEY_ASSET_SYSTEM',repositoryId:'JoeyAJ/joey-asset-system',ref:'migration/university-v04-portable',path:'DEVELOPMENT.md',expectedBaseline:'77b6766e790c7794bb1fc691f3f3dd3f4a4fe5c6',entryQualification:'SEPARATE_CANDIDATE_JOEY_ACCEPTANCE_PENDING',contextPaths:['modules/education/university-lifecycle/docs/HANDOFF.md','docs/UNIVERSITY_PORTABLE_MIGRATION.md','docs/CASE_002_UNIVERSITY_HANDOFF.md']};
export function projectEntryReadConfiguration(projectId,{track='BASELINE'}={}){
 if(!Object.hasOwn(records,projectId)||!['BASELINE','UNIVERSITY_CANDIDATE'].includes(track)||track==='UNIVERSITY_CANDIDATE'&&projectId!=='JOEY_ASSET_SYSTEM')throw Error('PROJECT_ENTRY_SCOPE_DENIED');
 return {...structuredClone(track==='UNIVERSITY_CANDIDATE'?university:records[projectId]),track};
}
