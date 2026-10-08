import {createHash} from 'node:crypto';
import {createReadStream, lstatSync, readdirSync, realpathSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {isAbsolute, resolve} from 'node:path';
import {PROMPT} from './protocol.mjs';
import {fail} from '../vendor/data.mjs';

// Native binary from official @openai/codex 0.161.0 linux-x64 package,
// integrity-checked and inspected with --help only in this cloud environment.
export const CODEX_SHA256 = '9a820c17865fa825d04db416818679a9d63bd72e50835c396f496e5684626c9c';
export const CODEX_BYTES = 292_309_256;
export const fixedArgv = workspace => ['exec', '--cd', workspace, '--sandbox', 'read-only', '--json',
  '--skip-git-repo-check', '--ephemeral', '--ignore-user-config', '-c', 'approval_policy="never"', '-c', 'web_search="disabled"', '-c', 'forced_login_method="chatgpt"', '--', PROMPT];
export async function qualifyRuntime(executable, workspace) {
  for (const path of [executable, workspace]) {
    if (!isAbsolute(path) || resolve(path) !== path || realpathSync(path) !== path || lstatSync(path).isSymbolicLink()) fail('RUNTIME_PATH_REJECTED');
  }
  const binary = lstatSync(executable), directory = lstatSync(workspace);
  if (!binary.isFile() || binary.size !== CODEX_BYTES || !(binary.mode & 0o111)
    || !directory.isDirectory() || directory.uid !== process.getuid() || (directory.mode & 0o777) !== 0o700
    || readdirSync(workspace).length) fail('RUNTIME_BINDING_REJECTED');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(executable)) hash.update(chunk);
  if (hash.digest('hex') !== CODEX_SHA256) fail('RUNTIME_DIGEST_MISMATCH');
  return Object.freeze({executable, workspace, binarySha256: CODEX_SHA256, codexVersion: '0.161.0'});
}
export function createProcessPort(binding) {
  return () => {
    // Never inherit API keys, external endpoints, model selection or argv.
    const env = {HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME,
      LANG: 'C.UTF-8', PATH: '/usr/bin:/bin'};
    const child = spawn(binding.executable, fixedArgv(binding.workspace), {cwd: binding.workspace,
      env, detached: true, shell: false, stdio: ['ignore', 'pipe', 'pipe']});
    let stopping = false, escalation;
    const exit = new Promise(resolveExit => {
      child.once('error', () => resolveExit({code: null, signal: null, spawnError: true}));
      child.once('close', (code, signal) => { clearTimeout(escalation); resolveExit({code, signal, spawnError: false}); });
    });
    return {stdout: child.stdout, stderr: child.stderr, exit,
      terminate() {
        if (stopping) return;
        stopping = true;
        try { if (child.pid) process.kill(-child.pid, 'SIGTERM'); } catch {}
        escalation = setTimeout(() => { try { if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch {} }, 5_000);
      }};
  };
}
