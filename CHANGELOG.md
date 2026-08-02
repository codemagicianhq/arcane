# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.15.2] - 2026-08-02

### Added

- Registry-driven self-host parity commands with a blocking CI check and negative drift coverage.
- Separate reporting for real content drift and line-ending-only differences.

### Changed

- Root dogfood copies under `.github/`, `.arcane/`, and `.claude/` are generated from canonical `src/assets/` sources.
- ARC-027 supersedes ARC-006's non-executable `spell update` self-refresh model.

## [0.14.0] - 2026-07-12

Initial public release.

[0.15.2]: https://github.com/codemagicianhq/arcane/compare/v0.15.1...v0.15.2
[0.14.0]: https://github.com/codemagicianhq/arcane/releases/tag/v0.14.0
