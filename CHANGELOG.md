# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.15.7] - 2026-08-02

### Added

- Install-once `README.md` and `project.md` orientation stubs for new repositories.

### Fixed

- Resolve spell governance links through the single installed `.arcane/governance/` layer.

## [0.15.6] - 2026-08-02

### Added

- Ship an offline legacy framework decision reference and fail CI for missing or malformed distributed ADR citations.

## [0.15.5] - 2026-08-02

### Added

- Define Arcane-vendored commit provenance with human authorship and programmatically derived vendor trailers.

## [0.15.4] - 2026-08-02

### Fixed

- Make close-session remote synchronization provider-neutral and skip all remote operations for local-only or read-only sessions.

## [0.15.3] - 2026-08-02

### Fixed

- Keep local-only `spell-commit-work` checkpoints on trunk when no authenticated supported remote merge path exists.
- Determine authorship before concern grouping and split every mixed-author batch into one-author commits.

## [0.15.2] - 2026-08-02

### Added

- Registry-driven self-host parity commands with a blocking CI check and negative drift coverage.
- Separate reporting for real content drift and line-ending-only differences.

### Changed

- Root dogfood copies under `.github/`, `.arcane/`, and `.claude/` are generated from canonical `src/assets/` sources.
- ARC-027 supersedes ARC-006's non-executable `spell update` self-refresh model.

## [0.14.0] - 2026-07-12

Initial public release.

[0.15.7]: https://github.com/codemagicianhq/arcane/compare/v0.15.6...v0.15.7
[0.15.6]: https://github.com/codemagicianhq/arcane/compare/v0.15.5...v0.15.6
[0.15.5]: https://github.com/codemagicianhq/arcane/compare/v0.15.4...v0.15.5
[0.15.4]: https://github.com/codemagicianhq/arcane/compare/v0.15.3...v0.15.4
[0.15.3]: https://github.com/codemagicianhq/arcane/compare/v0.15.2...v0.15.3
[0.15.2]: https://github.com/codemagicianhq/arcane/compare/v0.15.1...v0.15.2
[0.14.0]: https://github.com/codemagicianhq/arcane/releases/tag/v0.14.0
