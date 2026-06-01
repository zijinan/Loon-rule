# Maintainers

## Primary maintainer

- GitHub: `@zijinan`
- Scope: Loon, QuantumultX, Shadowrocket public-safe routing rules, plugins, and documentation.

## Maintenance responsibilities

- Review rule changes for privacy and secret-safety before merge.
- Triage reports about DNS leaks, app slowdowns, login/payment/voice/update regressions, and CDN routing issues.
- Keep public examples placeholder-only.
- Maintain release notes and document compatibility-impacting changes.
- Run or review `node scripts/validate-public-rules.js` for changes touching public configs, rules, plugins, or scripts.

## Review expectations

Changes should be small, reviewable, and tied to one maintenance goal. A PR can be merged when:

- Public-safety checks pass.
- The PR description explains affected clients and expected behavior.
- No real private configuration, credentials, certificates, tokens, cookies, or provider-identifying node details are present.
- The change does not intentionally break app login, payment, voice, update, or CDN traffic.
