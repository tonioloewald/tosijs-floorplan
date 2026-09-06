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

## tosijs

- **[tosijs#40](https://github.com/tonioloewald/tosijs/issues/40)** —
  re-vendor at 0.4.0+ (the remediated one, i.e. whatever `v0.4.0` points
  at) and redirect `audit.ts` to the exported `isInteractive` /
  `targetSizeFinding`, deleting the drifted copies. Closes the loop on
  incoming issue #4; includes the exemption-behavior change their audit
  adopts (visible text + wider-than-tall, not `label ?? text`).
  Filed 2026-09-06.
