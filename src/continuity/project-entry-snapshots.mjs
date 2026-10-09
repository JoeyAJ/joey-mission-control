// Server only. Metadata from bounded connector reads; no private document bodies.
// This module does not use or expand the MC-only website repository credential.
export const projectEntrySnapshots = [
  {
    "qualification": "CONNECTOR_VERIFIED_SOURCE_SNAPSHOT",
    "observedAt": "2026-10-09T15:06:22Z",
    "privateRepository": true,
    "websiteRepositoryReadable": false,
    "websiteContentIncluded": false,
    "rootHandoffStatus": "MISSING_AT_OBSERVED_SHA",
    "lastDeveloper": {
      "agent": null,
      "qualification": "NOT_EXPLICITLY_RECORDED"
    },
    "executionAuthorized": false,
    "projectId": "NEXAEON",
    "repositoryId": "JoeyAJ/nexaeon-web",
    "branch": "main",
    "commitSha": "8271e1bbae78eb7fc4fc86c06feaa50d6fa82c39",
    "authority": {
      "qualification": "DOCUMENTED_PRODUCTION_BRANCH_REFERENCE",
      "path": "docs/development-history/README.md"
    },
    "entryPath": "README.md",
    "version": "Stage 5-2 documented; Stage 5-4B configuration also present",
    "status": "UNIFIED_CURRENT_HANDOFF_MISSING",
    "nextSteps": "Reconcile README, stage documents and real canary evidence before dependent development. Stage 5-4B configuration is not evidence that the real canary completed; stop before Stage 5-4C without its separate approval.",
    "notes": [
      "The product Navigator/model described in README is not a development Agent signature.",
      "Historical development material is supporting reference; current production modules remain authoritative."
    ],
    "documents": [
      {
        "path": "README.md",
        "blobId": "1307357a5fb37ef8df5c1fa08503ef4f1022328f",
        "kind": "ENTRY",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/development-history/README.md",
        "blobId": "097456cffd4c9500ab943551665cddd5cafc496b",
        "kind": "HISTORY_INDEX",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/STAGE_5_2_ACCEPTANCE.md",
        "blobId": "570ceffc10c25a1f640e9f992ef64a74c59dc0bb",
        "kind": "CONTEXT",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/architecture/ADR-0054-n8n-tool-runtime.md",
        "blobId": "4fd18aa56a927d1d3133420bf9bf66b70c887eb2",
        "kind": "CONTEXT",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/STAGE_5_4_B_EXPLORER_N8N_CONFIGURATION.md",
        "blobId": "436cb707e8ae132f287ffa17c89c8ee5d722b94b",
        "kind": "CONTEXT",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      }
    ],
    "branches": [
      {
        "name": "feature/core-interactions",
        "commitSha": "6aef39b3316897c8f5e39f56c301c8bac411f036",
        "qualification": "SEPARATE_BRANCH_ACCEPTANCE_NOT_ESTABLISHED"
      }
    ]
  },
  {
    "qualification": "CONNECTOR_VERIFIED_SOURCE_SNAPSHOT",
    "observedAt": "2026-10-09T15:06:22Z",
    "privateRepository": true,
    "websiteRepositoryReadable": false,
    "websiteContentIncluded": false,
    "rootHandoffStatus": "MISSING_AT_OBSERVED_SHA",
    "lastDeveloper": {
      "agent": null,
      "qualification": "NOT_EXPLICITLY_RECORDED"
    },
    "executionAuthorized": false,
    "projectId": "WOOSONG_BUDDY",
    "repositoryId": "JoeyAJ/woosongbuddy",
    "branch": "main",
    "commitSha": "e41bd1b7d8a481fdf6402881f382605278d229af",
    "authority": {
      "qualification": "README_EXPLICIT_DEVELOPMENT_AUTHORITY",
      "path": "README.md"
    },
    "entryPath": "README.md",
    "version": "2026-10-06 stabilization and existing-theme public test scope",
    "status": "AUTHENTICATED_AND_DEVICE_ACCEPTANCE_INCOMPLETE",
    "nextSteps": "Use current release scope before historical stabilization plans. Legitimate pet/equipment acceptance and real-device PWA/GPS/audio remain incomplete; DB/RLS/Storage correctness is not established by source/build tests. Formal school identity remains deferred.",
    "notes": [
      "Remote HEAD and public-test release documents do not establish Joey acceptance. Earlier unaccepted candidates remain unaccepted without separate acceptance evidence.",
      "CLAUDE.md describes coding rules/builder tooling, not the latest development Agent.",
      "PROJECT_PLAN.md and MIGRATION_PLAN.md are older context. The dated stabilization draft predates release and does not supersede release documents."
    ],
    "documents": [
      {
        "path": "README.md",
        "blobId": "b87e1e03a206637209b00ef4ee9d81334ecf8776",
        "kind": "ENTRY",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "AGENTS.md",
        "blobId": "8bd0e39085d5260e7f8faffcad2fdc45e10aef33",
        "kind": "INSTRUCTIONS",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "CLAUDE.md",
        "blobId": "7fbfa82d60d26209fbc399b4603160274a050eeb",
        "kind": "PRODUCT_RULES",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/RELEASE_20261006.md",
        "blobId": "7953a40a1a2ef6cd310215551a8cf742c135c760",
        "kind": "CURRENT_RELEASE_SCOPE",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/THEME_PUBLIC_TEST_RELEASE_20261006.md",
        "blobId": "e5083237ea8125b573f8faeaf2e62efda8c995b0",
        "kind": "CURRENT_RELEASE_SCOPE",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/STABILIZATION.md",
        "blobId": "70fe4bbffdf0ed523085d4eb7b58ed38d8e49915",
        "kind": "HISTORICAL_HANDOFF",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/PROJECT_PLAN.md",
        "blobId": "44cccc60f12177e6ae45ae16cfbcc3c2f7661f0c",
        "kind": "HISTORICAL_PLAN",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      }
    ],
    "branches": [
      {
        "name": "feature/social-v5-20261006",
        "commitSha": "e41bd1b7d8a481fdf6402881f382605278d229af",
        "qualification": "SAME_OBSERVED_SHA_AS_MAIN"
      },
      {
        "name": "feat/pet-look-v3",
        "commitSha": "a2112729d3798b69741112d91bfd7bba6ff7441a",
        "qualification": "SEPARATE_BRANCH_ACCEPTANCE_NOT_ESTABLISHED"
      }
    ]
  },
  {
    "qualification": "CONNECTOR_VERIFIED_SOURCE_SNAPSHOT",
    "observedAt": "2026-10-09T15:06:22Z",
    "privateRepository": true,
    "websiteRepositoryReadable": false,
    "websiteContentIncluded": false,
    "rootHandoffStatus": "MISSING_AT_OBSERVED_SHA",
    "lastDeveloper": {
      "agent": null,
      "qualification": "NOT_EXPLICITLY_RECORDED"
    },
    "executionAuthorized": false,
    "projectId": "NAMYOUNG_WEB3D",
    "repositoryId": "JoeyAJ/namyoung-web3d",
    "branch": "main",
    "commitSha": "92c17b8adeec5eaa80d27b8facad532e6ff61d59",
    "authority": {
      "qualification": "DEFAULT_BRANCH_WITH_DOCUMENTED_PRODUCTION_REPOSITORY",
      "path": "docs/PRODUCTION_REBUILD.md"
    },
    "entryPath": "README.md",
    "version": "Visualization PoC; no current semantic version recorded",
    "status": "CURRENT_HANDOFF_AND_NEXT_SLICE_NOT_RECORDED",
    "nextSteps": "Read README and the production-chain document, then reconcile the authorized next slice before feature work. Fabrication details require approved shop drawings. No current explicit next-development action is recorded in the entry documents.",
    "notes": [
      "main is the only observed/default branch; a formal branch policy and Joey acceptance are not established by that fact.",
      "The archived controllable-wall PRD is separate historical Asset AI context; it is not the current Web3D project handoff."
    ],
    "documents": [
      {
        "path": "README.md",
        "blobId": "65affd9ecc91836e498915985ff3e185979935c0",
        "kind": "ENTRY",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/PRODUCTION_REBUILD.md",
        "blobId": "9b3e50170d4baec411fa545b11d15936b0069451",
        "kind": "PRODUCTION_CHAIN",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "docs/development-material/4d0fd7e329fe8d3f46b488aa758c4e02d4f0645140cc1b3721878b5b8b28f6cd.md",
        "blobId": "787b2e2d77f5c2f3ced14d02325796b9e55969ae",
        "kind": "SEPARATE_HISTORICAL_PRD",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      }
    ],
    "branches": []
  },
  {
    "qualification": "CONNECTOR_VERIFIED_SOURCE_SNAPSHOT",
    "observedAt": "2026-10-09T15:06:22Z",
    "privateRepository": true,
    "websiteRepositoryReadable": false,
    "websiteContentIncluded": false,
    "rootHandoffStatus": "MISSING_AT_OBSERVED_SHA",
    "lastDeveloper": {
      "agent": null,
      "qualification": "NOT_EXPLICITLY_RECORDED"
    },
    "executionAuthorized": false,
    "projectId": "JOEY_ASSET_SYSTEM",
    "repositoryId": "JoeyAJ/joey-asset-system",
    "branch": "main",
    "commitSha": "eb03e2a9d86abf8b53acfe207fb6737d255ba0d4",
    "authority": {
      "qualification": "MIGRATION_DOCUMENT_IDENTIFIES_ACCEPTED_MOTHER_BASELINE",
      "path": "docs/UNIVERSITY_PORTABLE_MIGRATION.md",
      "sourceBranch": "migration/university-v04-portable",
      "sourceCommitSha": "77b6766e790c7794bb1fc691f3f3dd3f4a4fe5c6"
    },
    "entryPath": "README.md",
    "version": "Accepted mother Phase 1 baseline; origin recovery 0.15.0",
    "status": "ACCEPTED_BASELINE_SEPARATE_FROM_UNIVERSITY_CANDIDATE",
    "nextSteps": "Keep the accepted mother baseline distinct from the University migration candidate. The University 0.4 candidate awaits Joey operational feedback and school-rule/policy clarification; no main merge or later lifecycle development is authorized by this entry.",
    "notes": [
      "main README still says phase_0_recovery_baseline; the candidate migration document identifies its base as the accepted Phase 1 mother commit.",
      "Candidate handoff says local/pending push, but the branch is connector-readable at the observed SHA. This stale phase text does not prove acceptance, merge or deployment."
    ],
    "documents": [
      {
        "path": "README.md",
        "blobId": "db0a682ef339069159b5f6261e15426845c368d9",
        "kind": "ENTRY",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "SYSTEM_CHARTER.md",
        "blobId": "02e47414930b0d749106afa1dc57dcaa89c7bb04",
        "kind": "CHARTER",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "cases/CASE_001_NAMYOUNG/README.md",
        "blobId": "8f668e1c4c0d77c01dd3ac1e6273c4342ed01d12",
        "kind": "RECOVERY_ENTRY",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      },
      {
        "path": "provenance/CASE_001_NAMYOUNG_RECOVERY.md",
        "blobId": "24eddafbdd24480e138ed0169abe96fd52d4e2f4",
        "kind": "RECOVERY_PROVENANCE",
        "qualification": "CONNECTOR_PINNED_FILE_READ"
      }
    ],
    "branches": [
      {
        "name": "migration/university-v04-portable",
        "commitSha": "77b6766e790c7794bb1fc691f3f3dd3f4a4fe5c6",
        "qualification": "CANDIDATE_JOEY_ACCEPTANCE_PENDING",
        "version": "education.university_lifecycle@0.4.0-admissions-candidate",
        "entryPath": "DEVELOPMENT.md",
        "documents": [
          {
            "path": "DEVELOPMENT.md",
            "blobId": "629c02e3cce63835bb0e6c3c76ee95a1ede8057a",
            "kind": "CANDIDATE_ENTRY",
            "qualification": "CONNECTOR_PINNED_FILE_READ"
          },
          {
            "path": "modules/education/university-lifecycle/docs/HANDOFF.md",
            "blobId": "e9d648562c3b637ff856b4303d5fc4fee7d153b7",
            "kind": "CANDIDATE_HANDOFF",
            "qualification": "CONNECTOR_PINNED_FILE_READ"
          },
          {
            "path": "docs/UNIVERSITY_PORTABLE_MIGRATION.md",
            "blobId": "93e5ed995237d8aa4f38f8d841472a4b273a0610",
            "kind": "MIGRATION_AUTHORITY",
            "qualification": "CONNECTOR_PINNED_FILE_READ"
          },
          {
            "path": "docs/CASE_002_UNIVERSITY_HANDOFF.md",
            "blobId": "5ca299527d5d060d5b48900ddf0d38e9d5f9ddfe",
            "kind": "CANDIDATE_CLASSIFICATION_HANDOFF",
            "qualification": "CONNECTOR_PINNED_FILE_READ"
          }
        ]
      }
    ]
  }
];
