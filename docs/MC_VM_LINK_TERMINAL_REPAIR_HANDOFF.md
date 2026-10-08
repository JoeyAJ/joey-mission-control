# Guided pairing terminal input and spacious connection panel repair

## Result and current release gate

The first failure can occur before any pairing request: the old masked reader exits on a blank Enter or a bracketed clipboard paste. The repair keeps waiting locally after blank/malformed input, accepts terminal paste framing, uses a readable ASCII prompt, and never echoes the code. The pairing flow now opens a viewport-height native dialog from a persistent workspace button, with the current step pinned above and the next action pinned below. The command and its copy control remain together.

**LOCAL VERIFIED; coordinated private release is still pending.** No live Edge deploy, preview-branch push, Owner mutation, new pairing/job, actual VM command, or production promotion was performed for this repair. Do not request another human attempt before the bootstrap and browser checksum are served consistently and verified.

## Evidence for the first failure

- Screenshot command worker ID matches the actual fence 4 worker; no demonstrated ID mismatch.
- Original pinned bootstrap SHA-256: `6db4da07651c73613eaf00decdcbda37293a2ae86f3bf2fcb0d7d12ea5aa45a4`.
- A real local interactive Bash/PTY executed the exact generated command with mock curl and fetch. A valid 51-character generated code plus Enter reached the mock POST with matching prepared ID, approved ID, code, and approved SHA-256.
- The original version returned `PAIRING_CODE_INVALID` before POST for blank Enter, malformed input, bracketed paste, and an extra Enter queued after the pasted shell command. The latter reproduces an early exit before any pairing code is entered.
- This local error is emitted before HTTP. Wrong server-side worker binding, pairing expiry, or hash mismatch would instead yield a broker HTTP denial. The exact original stdin bytes are unavailable; the evidence establishes reproducible causes without reading the exposed secret or assigning blame.
- JavaScript control-character escapes and code generation are correct; they were not changed as a purported cause.

## Repair and scope

- ASCII `MC pairing code (hidden; paste here, then Enter):` prompt works without Chinese terminal glyph support.
- Blank Enter does not submit. Invalid complete input is discarded and reprompted in the same process; no approval, ID, or code is regenerated.
- Streaming bracketed-paste framing, CR/LF, backspace, fragmented paste, and trailing clipboard newline are handled. Invalid characters/oversize/multiline input remain rejected locally; the accepted code format stays exactly 51 ASCII characters.
- Ctrl+C / Ctrl+D abort; terminal mode and paste mode are restored. Local waiting is bounded to 15 minutes; the existing server pairing deadline stays 10 minutes.
- The offline artifact builder now updates the browser command's bootstrap checksum from the generated public bootstrap. Worker archive, policy digest, SQL, Edge handler/index, signature validation, grants, and credentials are unchanged.
- Current step and short next-action guidance remain visible while job/evidence history scrolls. Native dialog keyboard focus, Escape, return focus, code clearing on close/hide, project and signout purging, and existing expiry timers are preserved.

## Validation

- Portable aggregate: **551/551**, build, schema, static safety, forbidden attempts 0.
- Real interactive PTY: **10 scenarios**, synthetic approval/controller and local fetch interception only. No network or actual VM/Owner actions; no code echo. Intentional mock `BROKER_HTTP_503` is the successful boundary marker after code/ID/hash verification, not an actual live denial.
- Dialog/pairing browser: **1440x900, 390x640, 320x640**, full-height panel outside the login popover, pinned header/footer, command grouping, keyboard focus, copy-before-hide, close-clears-code, no duplicate approval, storage 0 and external requests 0.
- Owner SDK lifecycle: **9 cases PASS**; worker evidence browser: **3 cases PASS**.
- **12 protected files byte-identical**. Owner browser entry differs only in where the dialog DOM is mounted; all Auth code is otherwise byte-identical.

Safe receipts are in `docs/contracts/vm-link/receipts/terminal-repair-20261008/`; synthetic screenshots and the source checkpoint are also in `/workspace/mc-deliverables/mc-pairing-first-failure-20261008/`.

## Actual readback and next actions

At **2026-10-08 10:50:48.737145 UTC**, fence 1–4 are all CANCELLED, terminal, not claimed, no spawn intent, events 0. Latest worker is unpaired, disabled, no registered public key, pairing expired, but **revoked=false**. Do not report worker revocation as confirmed. The last safe receipt inspection identifies a cancel request at 10:34:32 UTC, not a confirmed latest-worker revoke. Joey should only refresh the existing view and use **撤銷目前 worker**, rather than **請求取消**; no new pairing is needed for this cleanup.

Before a future human attempt, perform a coordinated release of the existing function's public bootstrap and the fixed private preview. Candidate bootstrap SHA-256: `eb053b359f139df44e20a7141a2cb5ead88f13dc013a53cabf3737229a76ad21`; worker artifact remains `9bb363726a13bd96341c84b015354daaa454c6265b5bf0d2c5aff6eab1e3d647`. Read back the exact public bootstrap bytes and the fixed preview bundle, verify both pins and unchanged production, then let the parent guide a single existing finite pilot. This repair is not real Auth/AAL2 or VM execution proof.
