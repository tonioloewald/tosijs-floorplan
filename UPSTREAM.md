# UPSTREAM

Issues this repo has filed on sibling repos (file, don't fix — the mirror
here is the index; the issue is the conversation).

## haltija

- **[haltija#45](https://github.com/tonioloewald/haltija/issues/45)** —
  arrow-token neutralization at extraction time, now spec-normative (MUST)
  for untrusted-content producers. From the 0.4.0 review's M1: the renderer
  cannot distinguish a suffix-position forged arrow from a real binding by
  construction, so the defense is producer-side for DOM extractors.
  Filed 2026-09-06; targets their 1.13 adoption alongside issue #1's plan.

- **[haltija#48](https://github.com/tonioloewald/haltija/issues/48)** —
  TARGET_FLAG_KINDS sign-off for their 1.13 record-shape adoption (their
  flags today are plain strings, verified in source; `'target'` matches
  their prefix and is in the set). Filed 2026-09-12 from the 0.5.0
  review's U1.

## tosijs

- **[tosijs#40](https://github.com/tonioloewald/tosijs/issues/40)** —
  re-vendor at the current release and redirect `audit.ts` to the
  exported predicates. Filed 2026-09-06 against 0.4.0; **extended
  2026-09-12 with 0.5.0 receipts**: scratch-clone dry-runs — 1033/1033
  with the final source vendored (`src/index.ts` as of `aa3032e`, the
  bytes `v0.5.0` will carry), and 29/29 audit tests with `auditView`
  neutered at the `bbd8b15` source (the #13 retirement, executed; the two
  commits differ only in the secret-scrub gates, which `auditView` never
  touched) — plus the U3 changelog ask: tosijs must
  name the `targetSizeFinding` `honorProducerFlags` default flip in its
  own changelog, since third parties inherit it via the public re-export.
