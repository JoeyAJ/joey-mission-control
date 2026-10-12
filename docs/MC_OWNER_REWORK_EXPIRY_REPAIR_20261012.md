# Rework freshness at the final local save boundary

Source-only repair to held rework dbbaa634. Reviewer's source concern is valid: task save clears review/CI and their timers before awaiting Owner; the old beforeSave callback checked form/source/report epochs but not captured freshness.

The review controller now retains its current read/append lease deadline. prepareRework captures both that deadline and the displayed CI deadline before its first await. The immutable capture survives intentional live-view cleanup. Final beforeSave checks both deadlines synchronously using the current clock after Owner verification and immediately before the task revision changes; exact expiry or invalid/missing deadline throws TASK_REWORK_EXPIRED. There is no await from that callback through the local revision/record update. Existing expected task, source/report epoch, dirty form, Owner and scope guards remain. canPrepareRework also refuses expired leases independently of timer delivery.

This is not a change to dated review history or execution authority. No remote task save, new grant, source scope, credential, Agent action or canonical release.

Verification uses ordinary checked-in pure deadline tests: immutable captured values after view cleanup, review-first/CI-first expiry, exact boundary and invalid/unknown deadlines. Five pure testsPASS; twenty-six affected existing review/rework/controller testsPASS, build and diff checksPASS. The denied reviewer synthetic race probe was not rerun or routed around. These tests do not establish actual OwnerHTTP or provider behavior. The generated Owner bundle is deliberately excluded from this source-only repair; canonical integration must regenerate it after renewed reviewGO.

Parent independently approved HANDOFF51ae2fd; its release must not wait for rework. Rework remainsHOLD until this repair receives independent review. Existing deployment guard remains only on the isolated review branch and must not be cherry-picked into canonical.
