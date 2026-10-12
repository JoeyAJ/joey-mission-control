import {createGitHubHandoffRepositoryReader, boundedPrivateJsonRequest} from '../continuity/remote-handoff-server.mjs';
import {REGISTRATION_FILES, registrationError} from './project-registration-contract.mjs';

// Explicit, single-repository read port. No credential discovery, repo creation,
// download URLs, branch writes, redirects or arbitrary source collection.
export function createProjectRegistrationRepositoryReader({credential, fetchImpl = globalThis.fetch, repositoryId, ref} = {}) {
  const reader = createGitHubHandoffRepositoryReader({credential, fetchImpl, configuration:{repositoryId, ref, path:REGISTRATION_FILES[0], contextPaths:REGISTRATION_FILES.slice(1)}});
  return Object.freeze({
    configured:reader.configured,
    async inspectIdentity({repositoryId:target, signal}) {
      if (!reader.configured || target !== repositoryId || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(target)) throw registrationError('REGISTRATION_SCOPE_DENIED', 403);
      const result = await boundedPrivateJsonRequest(fetchImpl, 'https://api.github.com/repos/' + target, {method:'GET', headers:{Authorization:'Bearer ' + credential, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10'}}, signal, 65536);
      if (result.status !== 200) throw registrationError('REGISTRATION_PRIVATE_READ_UNAVAILABLE', 503);
      return result.data;
    },
    resolveRevision:reader.resolveRevision,
    readFile:reader.readFile
  });
}
