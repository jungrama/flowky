# Changelog

All notable changes to Flowky are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Version numbers are kept in sync across `package.json`, `src-tauri/Cargo.toml`,
and `src-tauri/tauri.conf.json`.

## [Unreleased]

## [0.1.0] — 2026-07-10

First public release. macOS-only, fully local, no account.

### Added

- **Adaptive focus timer** — tape-ruler length picker that suggests a session
  length from recent history; drag to adjust, or start from a task. Pause,
  extend +10 min, and end early.
- **Tasks** — local todo list (add, rename, complete, delete) stored in SQLite.
  Pick a task to focus on from the Tasks tab or the timer's task field
  (bottom-sheet drawer).
- **Interruption logging** — one-tap "Got distracted" with typed categories.
- **Idle detection** — after 5 minutes of OS inactivity, an overlay confirms
  you're still there before auto-ending the session.
- **Break screen** — session summary, 1–5 quality rating, suggested break
  length, and a confetti send-off on a finished session.
- **Daily review** — focus score, 7-day chart with a today-vs-week comparison,
  deep-focus time, interruptions, and a per-session list with a bottom-sheet
  detail view.
- **Weekly summary** — weekly totals, best/toughest day, and a per-day
  breakdown.
- **Calendar heatmap** — monthly view shaded by daily focus score.
- **System tray** — menubar popover mirroring the live timer and controls; the
  tray title shows the running countdown.
- **Automatic distraction detection (Tier 3, opt-in)** — watches the active app
  and browser site during a session, classifies them (work / distraction /
  neutral), and shows a gentle nudge card on lingering. Manual logging always
  works alongside it.

### Design

- Black-and-white monochrome theme, light mode only.
- Built on Tailwind CSS 4 + shadcn/ui component primitives.

### Privacy

- All data stored locally in SQLite; no accounts, telemetry, or network calls.
- Browser window titles are classified in-memory only and never persisted.

[Unreleased]: https://example.com/flowky/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/flowky/releases/tag/v0.1.0
