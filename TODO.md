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
- [ ] **AAR entry at the next quarterly pass**: the 0.4.0 review's cycle
  flag — the security lens blocked on the remediation of a prior security
  finding (the SEC-8/#5 defense itself). Record in `reviews/AAR.md` when
  the quarterly AAR pattern review runs; the why-analysis belongs there.
