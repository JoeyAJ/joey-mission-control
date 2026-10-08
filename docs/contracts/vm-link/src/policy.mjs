import {digest,TASK,PROMPT,AUDIENCE} from './protocol.mjs';
import {CODEX_SHA256,CODEX_BYTES} from './runtime.mjs';
export const POLICY = Object.freeze({release:'0.1.1',project:'NEXAEON',host:'Ubuntu-1',region:'ap-southeast-2a',audience:AUDIENCE,
 task:TASK,prompt:PROMPT,codexVersion:'0.161.0',codexSha256:CODEX_SHA256,codexBytes:CODEX_BYTES,
 sandbox:'read-only',approvalPolicy:'never',webSearch:'disabled',toolPolicy:'abort-on-tool-event',pilotSeconds:900,taskSeconds:60,leaseSeconds:15,maxEvents:128,maxJobs:16,
 pairingSeconds:600,automaticRetry:false,arbitraryCommands:false,canonicalSubmit:false});
export const POLICY_DIGEST=digest(POLICY);
