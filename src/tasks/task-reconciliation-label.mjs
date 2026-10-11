// Provider labels have a stricter privacy boundary than approved task payloads.
// Keep task/SQL validation unchanged while sharing server/client label checks.
import {hasSensitiveTaskText} from './development-task.mjs';

const sensitiveLabel=/[\u0000-\u001f\u007f]|gh[pousr]_|github_pat_|Bearer\s|sb_secret_|PRIVATE KEY|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|\b(?:secret|password|token)\s*[:=]|api[\s_-]*key["']?\s*[:=]/i;
export const hasSensitiveReconciliationLabel=value=>typeof value==='string'&&(hasSensitiveTaskText(value)||sensitiveLabel.test(value));
