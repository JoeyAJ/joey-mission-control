import { createHash } from 'node:crypto';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function sourceRef(sourcePath, content, sourceSection='', metadata={}) { return {classification:'canonical',sourcePath,sourceSection,fingerprint:sha256(content),asOf:metadata.as_of||metadata.asOf,verificationStatus:metadata.verification_status||metadata.verificationStatus||'documented',readAt:new Date().toISOString()}; }
