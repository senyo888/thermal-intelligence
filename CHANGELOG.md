# Changelog

There is no stable release yet. Installable beta source and packages are on `senyo888-patch-1`.

## Documentation — 27 October 2026

- Add the product website and Wiki manual, with state examples and expandable detail galleries.
- Align installation, compatibility and upgrade guidance with beta.4.

## 0.1.0-beta.4 — 26 October 2026

- Fix a false amber health LED when VT explicitly reports no optional Off reason or Mode reason. The overview shows **None reported** for those two null values.
- Keep missing, unknown, unavailable and malformed observations visible. Readiness checks and command permissions are unchanged.
- No saved-configuration migration is needed.

## 0.1.0-beta.3 — 25 October 2026

- Add the response arc's corroborated warming state through explicit VT response sources, with an explanation in the overview.
- Require a current accepted heat request and matching recent room/trend evidence. Restricted, mismatching or expired evidence cannot produce orange.
- Preserve reported cooling, target bands, muted Off/unavailable states and the independent temperature-slope ring.
- Add visual response-source configuration. Existing unmapped cards retain their comparison fallback.

## 0.1.0-beta.2 — 25 October 2026

- Add a VT Lock/Unlock dialog for verified Home Assistant administrators. Other accounts and incomplete capabilities retain a read-only indicator.
- Use VT's native services, code validation, lock scope and automatic relocking. Requests are never automatically replayed.
- Keep lock codes out of saved configuration and request records. Suppress raw provider errors; see the [VT 10.5.1 limitation](docs/lock-control.md#code-handling-and-provider-limits).
- Keep the compact 14 px icon within a 44 px action target.

## 0.1.0-beta.1 — 25 October 2026

- Introduce the standalone thermostat, visual editor, per-card settings and optional telemetry without requiring a TI backend.
- Support standard climate capabilities and VT-specific readiness, restrictions and observations.
- Preserve the glass dial, focused detail panels, humidity presentation and staggered lights.
- Use separate beta card/editor registrations so existing TI cards can coexist.
- Add reproducible packaging, synthetic regression tests and installation/rollback guidance.
