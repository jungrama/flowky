## Goal

Build the React foundation: typed Tauri invoke wrappers, timer/session hooks, screen routing, and global styles.

## Acceptance criteria

### lib/tauri.ts
- [ ] Typed wrappers for all Tauri commands: `get_idle_seconds`, `send_notification`, `set_tray_state`, `save_session`, `get_sessions`, `compute_score`, `suggest_length`

### hooks/
- [ ] `useTimer.ts` — countdown logic with pause/resume, extend (+10 min), remaining seconds
- [ ] `useSessions.ts` — read/write session data via Tauri commands
- [ ] `useIdleWatcher.ts` — listen for `user-idle` Tauri event from backend

### App.tsx
- [ ] Screen state machine routing between all 7 screens (stubs OK for screens not yet built)
- [ ] Pass session context (task, depth, planned duration, interrupts) through navigation

### styles/globals.css
- [ ] CSS variables for colours, spacing, typography
- [ ] Respect system dark/light mode via `prefers-color-scheme`

## Reference

CLAUDE.md — Project structure, Interface journey (screen flow).

## Depends on

Rust backend commands must be available (sibling task).
