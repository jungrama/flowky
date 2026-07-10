## Goal

Implement the core focus timer UI: Home, Task Setup, Active Session, and Interruption Log screens.

## Acceptance criteria

### Home.tsx (Screen 1)
- [ ] Greeting with yesterday's focus score, session count, total deep focus time
- [ ] Primary "Start a session" button
- [ ] Footer note about system tray

### TaskSetup.tsx (Screen 2)
- [ ] Task name input
- [ ] Depth level selector: Light / Deep / Creative
- [ ] Suggested session length display (from `suggest_length` or default)
- [ ] Manual options: accept suggestion, 25 min, 60 min

### ActiveSession.tsx (Screen 3)
- [ ] Circular countdown ring showing time remaining
- [ ] Task name and start time below ring
- [ ] Actions: Pause, +10 min (extend), Got distracted, Done early
- [ ] "Got distracted" opens InterruptLog

### InterruptLog.tsx (Screen 4)
- [ ] Four tap targets: Slack/chat, Someone stopped by, Checked another app, Other
- [ ] One tap selects type and increments interrupt count
- [ ] Buttons: "Resume session" / "End session"

## Reference

CLAUDE.md — Interface journey screens 1–4, Core timer + Interruption tracking requirements.

## Depends on

Frontend foundation (hooks, routing, tauri.ts) must be complete.
