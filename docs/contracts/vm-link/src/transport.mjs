import {AUDIENCE, signedRequest} from './protocol.mjs';
import {fail} from '../vendor/data.mjs';

export function createTransport({workerId, privateKey, fetchImpl = globalThis.fetch}) {
  // Node 18 fetch does not automatically honor proxy environment variables.
  // Stop instead of silently taking a different network path.
  if (fetchImpl === globalThis.fetch && ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy'].some(key => process.env[key]))
    fail('STANDARD_PROXY_AGENT_REQUIRED');
  return async function request(action, body) {
    const envelope = signedRequest(privateKey, workerId, action, body);
    const response = await fetchImpl(AUDIENCE, {method: 'POST', redirect: 'error',
      headers: {'content-type': 'application/json'}, body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(5_000)});
    // Never echo an Auth/platform response or retry a claim with uncertain ACK.
    if (!response.ok) fail(`BROKER_HTTP_${response.status}`);
    const reader = response.body.getReader(); let bytes = 0, chunks = [];
    try {
      while (true) {
        const result = await reader.read(); if (result.done) break;
        bytes += result.value.length;
        if (bytes > 8_192) fail('BROKER_RESPONSE_LIMIT');
        chunks.push(Buffer.from(result.value));
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { await reader.cancel(); fail('BROKER_RESPONSE_INVALID'); }
  };
}
