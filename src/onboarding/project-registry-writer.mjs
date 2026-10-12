import {assertIssuedRegistrationReceipt, contentDigest, registrationError} from './project-registration-contract.mjs';

function registryIdentities(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 1048576 || text.includes('\0')) throw registrationError('REGISTRATION_REGISTRY_INVALID', 503);
  const ids = [...text.matchAll(/^(?:project_id|system_id):\s*([^\r\n]+)$/gm)].map(m => m[1].trim());
  const repositories = [...text.matchAll(/^github:\s*([^\r\n]+)$/gm)].map(m => m[1].trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git\/?$/, '').replace(/\/$/, '').toLowerCase());
  const repositoryNumericIds = [...text.matchAll(/^repository_numeric_id:\s*(\d+)\s*$/gm)].map(m => Number(m[1]));
  return {ids, repositories, repositoryNumericIds};
}
export function renderProjectRegistryRegistration(text, receipt, {now = Date.now()} = {}) {
  assertIssuedRegistrationReceipt(receipt, now);
  const existing = registryIdentities(text);
  if (existing.ids.includes(receipt.projectId) || existing.repositories.includes(receipt.repositoryId.toLowerCase()) || existing.repositoryNumericIds.includes(receipt.repositoryNumericId)) throw registrationError('REGISTRATION_TARGET_CONFLICT', 409);
  const numbers = [...text.matchAll(/^###\s+(\d+)\. /gm)].map(m => Number(m[1]));
  if (numbers.some(n => !Number.isSafeInteger(n) || n < 1 || n > 100000)) throw registrationError('REGISTRATION_REGISTRY_INVALID', 503);
  const number = Math.max(0, ...numbers) + 1;
  // Existing reader consumes single-line scalar fields. Newlines and markup in
  // the human name never enter its numbered heading or YAML structure.
  const name = receipt.name.replace(/[\r\n`#<>]/g, ' ').trim() || receipt.projectId;
  const values = {project_id:receipt.projectId, local_master:null, github:receipt.repositoryId, branch:receipt.ref,
    local_head:receipt.baselineSha, github_main_head:receipt.ref === 'main' ? receipt.baselineSha : null,
    production_source_sha:null, production:null, alignment:'REGISTRY_VERIFIED_SCOPES_PENDING',
    repository_numeric_id:receipt.repositoryNumericId, canonical_entry:'HANDOFF.md', canonical_entry_sha256:receipt.files['HANDOFF.md'].sha256,
    registration_receipt:receipt.requestId, registration_qualification:receipt.qualification,
    backend_ref:receipt.resources.backend?.target.projectRef ?? null,
    deployment_project_ref:receipt.resources.deployment?.target.projectId ?? null,
    deployment_preview:receipt.resources.deployment?.target.url ?? null};
  const block = '\n### ' + number + '. ' + name + '\n\n```yaml\n' + Object.entries(values).map(([k, v]) => k + ': ' + (v ?? 'null')).join('\n') + '\n```\n';
  return text.replace(/\s*$/, '\n') + block;
}

function canonicalMemory(receipt) {
  const directory = 'PROJECTS/' + receipt.projectId;
  const source = 'Repository: ' + receipt.repositoryId + '\nBranch: ' + receipt.ref + '\nVerified baseline: ' + receipt.baselineSha + '\nEntry: HANDOFF.md\nEntry SHA256: ' + receipt.files['HANDOFF.md'].sha256 + '\nObservedAt: ' + new Date(receipt.observedAt).toISOString() + '\nQualification: INDEPENDENT_PRIVATE_REPOSITORY_IMPORT\n';
  const stage = 'Private repository imported and canonical documents verified at the recorded baseline. Source and report activation are pending; development execution and delivery remain unverified.';
  return Object.fromEntries(Object.entries({
    PROJECT_MEMORY:'# ' + receipt.projectId + '\n\n## Purpose\n\nRead the verified PRD.md in the recorded private repository for the Owner idea and acceptance criteria.\n\n## Registered source\n\n' + source,
    CURRENT_STATE:'# ' + receipt.projectId + ' state\n\n## Current Stage\n\n' + stage + '\n\n## Blockers\n\nExact source read scope and report write scope are pending activation. Backend: ' + receipt.environmentStatus + '. Deployment: ' + receipt.deploymentStatus + '. Joey acceptance: PENDING.\n',
    NEXT_ACTIONS:'# ' + receipt.projectId + ' next actions\n\n## Recommended Next Step\n\nActivate the approved exact source/report scopes and verify the runtime connection. Then follow the real repository HANDOFF.md and obtain an actual Agent start report.\n\n## Blockers\n\nRegistration does not grant execution, report writes, backend access or deployment authority.\n',
    ARCHITECTURE:'# ' + receipt.projectId + ' architecture\n\n## Registered source\n\n' + source + '\nNo architecture or live service has been inferred from registration.\n',
    DECISIONS:'# ' + receipt.projectId + ' decisions\n\n## Registration\n\nAn existing private repository was independently read; MC did not create it. Configuration observations are separate from verified delivery. Approval reference: ' + receipt.approvalRef + '.\n'
  }).map(([file, content]) => [directory + '/' + file + '.md', content]));
}
function renderIndex(text, receipt) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 1048576 || text.includes('\0')) throw registrationError('REGISTRATION_INDEX_INVALID', 503);
  if (text.includes('`' + receipt.projectId + '`') || text.includes('PROJECTS/' + receipt.projectId + '/')) throw registrationError('REGISTRATION_TARGET_CONFLICT', 409);
  const directory = 'PROJECTS/' + receipt.projectId;
  const name = receipt.name.replace(/[|`\r\n#<>\[\]()]/g, ' ').trim() || receipt.projectId;
  const row = '| ' + name + ' (`' + receipt.projectId + '`) | [M](' + directory + '/PROJECT_MEMORY.md) | [S](' + directory + '/CURRENT_STATE.md) | `null` |\n';
  const marker = /^## Production Development Registry\s*$/m, match = marker.exec(text);
  if (!match) return text.replace(/\s*$/, '\n') + '\n## Production Development Registry\n\n| Project | Memory | Current State | Canonical Local Master |\n|---|---|---|---|\n' + row;
  const start = match.index + match[0].length, allRemainder = text.slice(start), boundary = /^## /m.exec(allRemainder);
  const remainder = boundary ? allRemainder.slice(0, boundary.index) : allRemainder;
  const table = /^\| Project \| Memory \| Current State \| Canonical Local Master \|\r?\n\|[- |:]+\|\r?\n(?:\|[^\r\n]+\|\r?\n)*/m.exec(remainder);
  if (!table) throw registrationError('REGISTRATION_INDEX_FORMAT_UNSUPPORTED', 503);
  const end = start + table.index + table[0].length;
  return text.slice(0, end) + row + text.slice(end);
}

// Local reference writer only: no filesystem, remote calls or runtime activation.
// A live adapter must atomically persist registry + receipt/idempotency ledger and
// recheck authorization inside its commit boundary with the same CAS semantics.
export function createLocalProjectRegistryWriter({registryText, memoryIndexText, memoryFiles = {}, now = Date.now} = {}) {
  registryIdentities(registryText);
  if (typeof memoryIndexText !== 'string' || Buffer.byteLength(memoryIndexText) > 1048576) throw registrationError('REGISTRATION_INDEX_INVALID', 503);
  let text = registryText, index = memoryIndexText, files = structuredClone(memoryFiles);
  const ledger = new Map();
  return Object.freeze({
    qualification:'LOCAL_REGISTRY_CANDIDATE_ONLY',
    inspect() { return {qualification:'LOCAL_REGISTRY_CANDIDATE_ONLY', digest:contentDigest(text), indexDigest:contentDigest(index), registryText:text, memoryIndexText:index, memoryFiles:structuredClone(files), receipts:[...ledger.values()].map(v => structuredClone(v.result.receipt))}; },
    async commit({receipt, expectedDigest, expectedIndexDigest, authorize}) {
      if (typeof authorize !== 'function') throw registrationError('OWNER_AUTHORIZATION_DENIED', 403);
      await authorize();
      assertIssuedRegistrationReceipt(receipt, now());
      const key = receipt.ownerSubject + ':' + receipt.requestId, prior = ledger.get(key);
      if (prior) {
        if (prior.digest !== receipt.requestDigest) throw registrationError('REGISTRATION_REPLAY_CONFLICT', 409);
        return {...structuredClone(prior.result), replay:true};
      }
      if (contentDigest(text) !== expectedDigest) throw registrationError('REGISTRATION_REGISTRY_REVISION_CONFLICT', 409);
      if (contentDigest(index) !== expectedIndexDigest) throw registrationError('REGISTRATION_INDEX_REVISION_CONFLICT', 409);
      const next = renderProjectRegistryRegistration(text, receipt, {now:now()});
      const nextIndex = renderIndex(index, receipt), newFiles = canonicalMemory(receipt);
      if (Object.keys(files).some(p => p.startsWith('PROJECTS/' + receipt.projectId + '/'))) throw registrationError('REGISTRATION_TARGET_CONFLICT', 409);
      const result = {qualification:'LOCAL_REGISTRY_CANDIDATE_ONLY', registryDigest:contentDigest(next), indexDigest:contentDigest(nextIndex), canonicalMemoryPaths:Object.keys(newFiles), receipt, replay:false, liveRegistered:false};
      // No awaits from the final CAS through the update of both artifacts.
      text = next; index = nextIndex; files = {...files, ...newFiles}; ledger.set(key, {digest:receipt.requestDigest, result});
      return structuredClone(result);
    }
  });
}
