import {createGitHubHandoffRepositoryReader, boundedPrivateJsonRequest} from '../continuity/remote-handoff-server.mjs';
import {REGISTRATION_FILES, registrationError} from './project-registration-contract.mjs';

// Explicit, single-repository read port. No credential discovery, repo creation,
// download URLs, branch writes, redirects or arbitrary source collection.
export function createProjectRegistrationRepositoryReader({credential, fetchImpl = globalThis.fetch, repositoryId, ref} = {}) {
  const reader = createGitHubHandoffRepositoryReader({credential, fetchImpl, configuration:{repositoryId, ref, path:REGISTRATION_FILES[0], contextPaths:REGISTRATION_FILES.slice(1)}});
  const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
  const commits = new Map(), trees = new Map();
  const invalid = () => { throw registrationError('REGISTRATION_GIT_ENTRY_INVALID', 409); };
  const request = async (path, signal, limit = 262144) => {
    const result = await boundedPrivateJsonRequest(fetchImpl, 'https://api.github.com/repos/' + repositoryId + path, {method:'GET', headers:{Authorization:'Bearer ' + credential, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10'}}, signal, limit);
    if (result.status !== 200) throw registrationError('REGISTRATION_PRIVATE_READ_UNAVAILABLE', 503);
    return result.data;
  };
  async function cached(map, key, read) {
    if (!map.has(key)) map.set(key, read());
    try { return await map.get(key); } catch (e) { map.delete(key); throw e; }
  }
  async function pinnedEntry(commitSha, path, signal) {
    const commit = await cached(commits, commitSha, () => request('/git/commits/' + commitSha, signal));
    if (commit.sha !== commitSha || !sha(commit.tree?.sha)) invalid();
    let treeSha = commit.tree.sha; const parts = path.split('/');
    for (let i = 0; i < parts.length; i++) {
      // Direct ancestor trees only; never recursive and never a symlink target.
      const tree = await cached(trees, treeSha, () => request('/git/trees/' + treeSha, signal));
      if (tree.sha !== treeSha || tree.truncated !== false || !Array.isArray(tree.tree) || tree.tree.length > 2048) invalid();
      const matches = tree.tree.filter(entry => entry.path === parts[i]);
      if (matches.length !== 1 || !sha(matches[0].sha)) invalid();
      const entry = matches[0], last = i === parts.length - 1;
      if (last) {
        if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) invalid();
        return {path, mode:entry.mode, blobId:entry.sha, commitSha};
      }
      if (entry.type !== 'tree' || entry.mode !== '040000') invalid();
      treeSha = entry.sha;
    }
    invalid();
  }
  return Object.freeze({
    configured:reader.configured,
    async inspectIdentity({repositoryId:target, signal}) {
      if (!reader.configured || target !== repositoryId || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(target)) throw registrationError('REGISTRATION_SCOPE_DENIED', 403);
      const result = await boundedPrivateJsonRequest(fetchImpl, 'https://api.github.com/repos/' + target, {method:'GET', headers:{Authorization:'Bearer ' + credential, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10'}}, signal, 65536);
      if (result.status !== 200) throw registrationError('REGISTRATION_PRIVATE_READ_UNAVAILABLE', 503);
      return result.data;
    },
    resolveRevision:reader.resolveRevision,
    async readFile({repositoryId:target, commitSha, path, maxBytes, signal}) {
      if (!reader.configured || target !== repositoryId || !sha(commitSha) || !REGISTRATION_FILES.includes(path) || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 98304) throw registrationError('REGISTRATION_SCOPE_DENIED', 403);
      const gitTreeEntry = await pinnedEntry(commitSha, path, signal);
      const data = await request('/contents/' + path.split('/').map(encodeURIComponent).join('/') + '?ref=' + commitSha, signal);
      if (data.type !== 'file' || data.path !== path || data.sha !== gitTreeEntry.blobId || data.target || data.submodule_git_url || data.encoding !== 'base64' || typeof data.content !== 'string' || !Number.isSafeInteger(data.size) || data.size < 1 || data.size > maxBytes) invalid();
      try {
        const encoded = data.content.replace(/\n/g, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) invalid();
        const bytes = Buffer.from(encoded, 'base64');
        if (bytes.length !== data.size || bytes.length > maxBytes) invalid();
        return {status:'FOUND', entryType:'file', commitSha, blobId:data.sha, gitTreeEntry, content:new TextDecoder('utf-8', {fatal:true}).decode(bytes)};
      } catch { invalid(); }
    }
  });
}
