# TODO

Follow-ups from the 0.4.0 pre-release review (`reviews/0.4.0-producer-parity.md`)
that survived remediation — everything else in that report was fixed in the
remediation commit or filed upstream (see `UPSTREAM.md`).

- [ ] **Producer-flag supersession match breadth**: `targetSizeFinding`
  stands down when any flag `kind` *contains* `target` — `retargeting`
  would falsely supersede the WCAG audit. The README says "mentions
  target", so tightening is a spec conversation with both producers, not a
  quiet edit. Decide, then pin with tests in the false-supersession
  direction.
- [ ] **"Introspected and found nothing" has no encoding**: only
  `interactive: true` / `editable: true` are signal; `false` cannot veto
  record-level evidence (documented + pinned in 0.4.0). If a producer wants
  to assert *non*-affordance, propose the encoding via issue first.
- [ ] **AAR entry at the next quarterly pass**: two cycle flags from the
  0.4.0 reviews — round 1: the security lens blocked on the remediation of
  a prior security finding (the SEC-8/#5 defense itself); round 2: both
  gates sat in round 1's remediation. Record in `reviews/AAR.md` when the
  quarterly AAR pattern review runs; the why-analysis belongs there.
- [ ] **release-doctor preflight seam** (optional — local wiring chosen):
  release-doctor has no mechanism for project-local preflight checks, so
  `tools/byte-stability.ts` can't participate in Tier 0 and must be run by
  hand (`bun run stability`, per CLAUDE.md). If a second repo grows a
  preflight tool, file the seam ask on tosijs-coding-practices (e.g. run
  `scripts.stability` reporting SKIP-not-pass when offline) instead of
  duplicating the hand-run convention.
