// Public, pinned command. Only a non-secret UUID is interpolated; no pairing code.
export const vmBootstrapDigest='eb053b359f139df44e20a7141a2cb5ead88f13dc013a53cabf3737229a76ad21';
export function vmBootstrapCommand(workerId){
 if(!/^ubuntu-1-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(workerId||''))throw Error('LINK_WORKER_INVALID');
 return `mc_bootstrap_path=$(mktemp /tmp/mc-vm-link-bootstrap.XXXXXX.mjs) && curl --fail --silent --show-error --proto '=https' --tlsv1.2 --max-time 15 'https://scmvedfqwlhkyvljymjj.supabase.co/functions/v1/mc-worker-link-v1/bootstrap.mjs' --output "$mc_bootstrap_path" && printf '%s  %s\\n' '${vmBootstrapDigest}' "$mc_bootstrap_path" | sha256sum --check --status && node "$mc_bootstrap_path" '${workerId}'`;
}
