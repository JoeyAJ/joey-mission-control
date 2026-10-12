# Private project registration candidate

Checkpoint: isolated branch `codex/mc-registry-receipts-20261012`, based on canonical
`cab187ea5208fabe82d47cfe47bdf32cc3d4f0c1`.

This candidate adds an inactive server-side interface for importing an already-created
private repository. It will consume the existing saved project draft, independently
read repository identity, source HEAD and canonical documents, and produce a
revision-checked canonical registry update with its verification receipt.

No repository is created, no external write is activated, and no SQL, ACL, credential,
reporting grant, deployment, or existing five-project read scope is changed.
Repository import and registration are separate from development/report activation
and from verified delivery or Joey acceptance.

Implementation and local verification details will be completed in this document.
