## Goal

Implement the full Rust backend for Flowky v1: SQLite persistence, OS idle detection, notifications, tray state, and basic scoring.

## Acceptance criteria

### db.rs
- [ ] SQLite schema per CLAUDE.md (`sessions` table with all columns)
- [ ] `save_session(session: Session) -> Result<(), String>`
- [ ] `get_sessions(days: u32) -> Result<Vec<Session>, String>`
- [ ] DB file at platform-appropriate path (macOS: `~/Library/Application Support/flowky/flowky.db`)

### watcher.rs
- [ ] `get_idle_seconds() -> u64` via OS idle API
- [ ] Background poll that emits `user-idle` Tauri event when idle ≥ 5 min (for frontend overlay)

### notifications.rs
- [ ] `send_notification(title: String, body: String)`
- [ ] `set_tray_state(state: String)` — `"idle" | "running" | "break"` updates tray icon

### scorer.rs
- [ ] `compute_score(sessions: Vec<Session>) -> f32` — v1: completion rate only (full weighted algorithm can stub to completion-only for now)
- [ ] `suggest_length(sessions: Vec<Session>) -> u32` — return sensible default (e.g. 25 min) until adaptive data exists

### main.rs
- [ ] Register all commands, initialize SQL plugin, set up system tray

## Command surface (all must be registered)

```
get_idle_seconds, send_notification, set_tray_state,
save_session, get_sessions, compute_score, suggest_length
```

## Reference

CLAUDE.md — Rust backend, SQLite schema, Scoring algorithm sections.

## Depends on

Project scaffold (sibling task) must be complete.
