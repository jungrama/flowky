## Goal

Implement Daily Review screen and wire up system tray integration for v1 MVP completion.

## Acceptance criteria

### DailyReview.tsx (Screen 7)
- [ ] Focus score (0–100) colour-coded green/amber/red
- [ ] 7-day bar chart of daily scores
- [ ] Three metric cards: deep focus time, interruption count, sessions completed
- [ ] Per-session list: task name, duration, interrupt count, dot colour by quality (green = clean, coral = interrupted)
- [ ] Accessible from Break screen and via navigation

### System tray
- [ ] App lives in system tray (configured in Tauri)
- [ ] Tray icon reflects session state: idle / running / break (via `set_tray_state`)
- [ ] Click tray icon opens/focuses main window
- [ ] Tray menu entry to open Daily Review

### Session lifecycle polish
- [ ] OS notification when session completes (via `send_notification`)
- [ ] Tray state updates on session start/pause/end/break

## Reference

CLAUDE.md — Interface journey screen 7, System tray requirements, v1 MVP checklist.

## Depends on

Break + Idle overlay task must be complete.
