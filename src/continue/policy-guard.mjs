import { sha256 } from '../canonical/fingerprint.mjs';

function validFingerprint(item) {
  return Boolean(item && typeof item.path === 'string' && item.path && /^[a-f0-9]{64}$/.test(item.fingerprint || ''));
}

export function continuationConflicts({ git = {}, storedContext = {}, currentFingerprints = [] }) {
  const conflicts = [];
  if (git.error) conflicts.push(`Git observation failed: ${git.error}`);
  for (const field of ['head', 'path', 'branch']) {
    if (!git[field]) conflicts.push(`Missing observed Git ${field}`);
    if (!storedContext[field]) conflicts.push(`Missing stored Git ${field}`);
  }
  if (storedContext.head && git.head && git.head !== storedContext.head) conflicts.push('Commit differs from stored context');
  if (storedContext.path && git.path && git.path !== storedContext.path) conflicts.push('Workspace path differs from stored context');
  if (storedContext.branch && git.branch && git.branch !== storedContext.branch) conflicts.push('Branch differs from stored context');
  if (!git.dirtyState) conflicts.push('Missing observed Git dirty state');
  else if (git.dirtyState !== 'clean') conflicts.push(`Workspace is ${git.dirtyState}`);
  if (!git.upstream) conflicts.push('Missing observed Git upstream');
  if (!Number.isInteger(git.ahead)) conflicts.push('Missing observed Git ahead count');
  else if (git.ahead !== 0) conflicts.push(`Workspace is ahead of upstream by ${git.ahead}`);
  if (!Number.isInteger(git.behind)) conflicts.push('Missing observed Git behind count');
  else if (git.behind !== 0) conflicts.push(`Workspace is behind upstream by ${git.behind}`);
  if (!git.observedAt || Number.isNaN(Date.parse(git.observedAt))) conflicts.push('Missing or invalid Git observation timestamp');
  if (storedContext.sessionPath && git.path && storedContext.sessionPath !== git.path) conflicts.push('Session workspace path differs from observed Git path');
  if (storedContext.sessionPath && storedContext.path && storedContext.sessionPath !== storedContext.path) conflicts.push('Session workspace path differs from canonical workspace path');
  const viewedSession=storedContext.viewedSession??null,currentSession=storedContext.currentSession??null;
  if(currentSession&&!viewedSession)conflicts.push('Missing viewed AI session context');
  else if(!currentSession&&viewedSession)conflicts.push('Viewed AI session no longer exists');
  else if(currentSession&&viewedSession){const keys=new Set([...Object.keys(viewedSession),...Object.keys(currentSession)]);for(const key of keys)if(viewedSession[key]!==currentSession[key])conflicts.push(`Viewed AI session ${key} is stale`);}

  const viewedGit = storedContext.viewedGit;
  if (!viewedGit || typeof viewedGit !== 'object') conflicts.push('Missing viewed Git context');
  else {
    for (const field of ['head', 'path', 'branch', 'upstream', 'dirtyState', 'ahead', 'behind']) {
      if (viewedGit[field] !== git[field]) conflicts.push(`Viewed Git ${field} is stale`);
    }
    if (viewedGit.observationFingerprint && git.observationFingerprint && viewedGit.observationFingerprint !== git.observationFingerprint) conflicts.push('Viewed Git observation fingerprint is stale');
  }

  const stored = storedContext.fingerprints || [];
  const current = currentFingerprints || [];
  if (!stored.length) conflicts.push('Missing stored source fingerprints');
  if (!current.length) conflicts.push('Missing current source fingerprints');
  if (stored.some(item => !validFingerprint(item)) || current.some(item => !validFingerprint(item))) conflicts.push('Incomplete source fingerprint');
  if (new Set(stored.map(item => item.path)).size !== stored.length || new Set(current.map(item => item.path)).size !== current.length) conflicts.push('Duplicate source fingerprint path');
  for (const old of stored) {
    const now = current.find(item => item.path === old.path);
    if (!now || now.fingerprint !== old.fingerprint) conflicts.push(`Stale source fingerprint: ${old.path || 'unknown path'}`);
  }
  if (stored.length !== current.length) conflicts.push('Source fingerprint set is incomplete');
  return [...new Set(conflicts)];
}

export function fingerprintSetDigest(fingerprints) {
  return sha256(JSON.stringify([...fingerprints].sort((a, b) => a.path.localeCompare(b.path))));
}
