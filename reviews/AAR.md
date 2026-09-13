# After-action reports

Newest first. Facts, not analysis — the quarterly pass asks the whys.

## 0.5.0 — 2026-09-13

- Went well: all nine adoption issues (#7–#15, all from tosijs 1.11.0)
  landed as one batch; the exported predicates now reproduce audit
  verdicts (tosijs's auditView verified deletable by neutering it in a
  scratch clone — 29/29). Round-3 follow-ups were all executed pre-tag
  rather than deferred.
- Went well: the version-keyed license self-expiry executed for real at
  publish — all four 0.5.0 licenses flagged stale, bytes identical,
  deleted same-day; the verdict fixtures are byte pins now.
- Didn't (cycle flags, ×2): rounds 1 and 2 both BLOCKed on the secret-
  redaction path — first the metadata scrub fail-open (G1), then the
  scrub missing `image` (B1) — the same field-list/spec-gap class twice
  in one cycle.
- Didn't: the first `npm publish` failed silently (user report:
  "apparently the last time really did fail") — second occurrence of
  publish-confirmation friction in two releases (0.4.0: slow propagation
  read as done; 0.5.0: reported done, never landed). Registry-direct
  verification caught both before tagging.
- Follow-through open: tosijs#40 re-vendor at v0.5.0 (receipts on
  thread), haltija#45/#48 (their 1.13), TODO.md ×4.

## 0.4.0 — 2026-09-06

- Went well: all four open consumer issues (#2–#5) closed through one seam
  (the interactivity predicate); both producers' findings converged on the
  same fix. Byte-stability vs published 0.3.0 held through two remediation
  rounds and is now a committed harness (`bun run stability`).
- Went well: the tiered review BLOCKed twice on real, execution-confirmed
  defects in the release's own headline security fix — 44/44 then 49/49
  tests were green over both holes; the review found what the suite
  couldn't.
- Didn't: two review rounds, and both rounds' gates sat in the previous
  round's remediation (round 1: security lens on the SEC-8/#5 defense;
  round 2: both gates in B1's remediation — an overclaiming spec sentence
  and a guard whose header claimed wiring that didn't exist).
- Didn't: "publish is done" was declared before the registry showed the
  version; propagation was slow and the tag correctly waited on direct
  registry confirmation.
- Follow-through open: tosijs#40 (re-vendor + audit redirect),
  haltija#45 (extraction-time neutralization, their 1.13), TODO.md
  (3 items incl. the release-doctor preflight seam trigger).
