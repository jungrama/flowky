## Goal

Implement Break screen and Idle overlay — post-session flow and away-detection UX.

## Acceptance criteria

### BreakScreen.tsx (Screen 5)
- [ ] Session summary: time focused, interruption count
- [ ] 1–5 quality rating (one tap); rating saved to session and feeds scorer
- [ ] Break countdown pill (auto-suggest break length after session ends)
- [ ] Actions: "Start next session" / "See today's review"
- [ ] On session end: persist session via `save_session`, call `set_tray_state("break")`

### IdleOverlay.tsx (Screen 6)
- [ ] Appears after 5 min OS idle (via `useIdleWatcher`)
- [ ] Dark semi-transparent overlay with pulsing ring animation
- [ ] Copy: "Hey — still there? Your session is still running."
- [ ] 30-second draining progress bar before auto-ending session
- [ ] Buttons: "I'm back, keep going" / "End session"
- [ ] At 15 min idle: softer break-suggestion message
- [ ] At 30 min idle: auto-end and log session as `abandoned`

## Reference

CLAUDE.md — Interface journey screens 5–6, Idle detection + Break timer requirements.

## Depends on

Core timer UI (ActiveSession) must be complete.
