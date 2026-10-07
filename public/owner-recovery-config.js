// Local candidate only. Exact redirect was saved and read back by the authorized settings task.
// Capabilities below require a user's explicit typed submission; no automatic action.
// No private email, recovery token or additional provider identifier belongs here.
export const ownerRecoveryConfig=Object.freeze({
 callbackEnabled:true,
 urlConfigurationVerified:true,
 passwordChangeApproved:true,
 emailSendingApproved:true
});
