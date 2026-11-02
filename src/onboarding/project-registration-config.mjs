// Server only. Neither environment nor browser input can enable live registration.
export const registrationCatalogTarget = Object.freeze({repositoryId:'JoeyAJ/joey-mission-control', repositoryNumericId:1404959099, ref:'mc/registry'});
// Pinned catalog HOST identity, independently observed on GitHub. Imported project
// repositories still require private:true / visibility:private in their own contract.
// This does not change repository visibility or any Owner/read/write authorization.
export const registrationCatalogHostIdentity = Object.freeze({private:false,visibility:'public',archived:false,disabled:false});
export const registrationReservedRepositoryIds = Object.freeze([1404959099,1250989709,1183908659,1402869585,1403778863]);
export const projectRegistrationActivation = Object.freeze({enabled:true, qualification:'OWNER_PRIVATE_GIT_CATALOG_APPROVED', approvalRef:'owner-registration-20261012', ownerNamespace:'JoeyAJ', destination:registrationCatalogTarget});
export function registrationActivated(a = projectRegistrationActivation) {
  return a?.enabled === true && a.qualification === 'OWNER_PRIVATE_GIT_CATALOG_APPROVED' && /^[A-Za-z0-9_-]{1,80}$/.test(a.approvalRef || '') && a.ownerNamespace === 'JoeyAJ' && JSON.stringify(a.destination) === JSON.stringify(registrationCatalogTarget);
}
