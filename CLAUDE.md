# Flowky

> A clock that bends to your flow.

## What is this?

Most focus timers force the same rigid schedule on everyone. Flowky watches how you actually work — how often you get interrupted, how long it takes you to hit flow, whether you finish sessions or bail — and adapts its suggestions over time.

The result: short sessions on scattered days, long uninterrupted blocks when you're locked in. Flowky meets you where you are instead of demanding you fit a productivity template.

Built as a native desktop app (macOS / Windows / Linux) using Tauri. Fully local — no account, no server, no data leaving your machine.

## Stack


| Layer             | Technology                    | Why                                                      |
| ----------------- | ----------------------------- | -------------------------------------------------------- |
| Desktop framework | Tauri 2                       | Tiny bundle (~8 MB), native OS APIs, system tray support |
| Frontend          | React + TypeScript            | Component model suits a timer UI well                    |
| Build tool        | Vite                          | Fast HMR, works seamlessly with Tauri                    |
| Backend           | Rust (Tauri commands)         | OS window focus API, idle detection, notifications       |
| Database          | SQLite via `tauri-plugin-sql` | Local, zero-config, fast for session logs                |
| Styling           | CSS variables + plain CSS     | No framework overhead for a small UI                     |


### Key dependencies

```toml
# src-tauri/Cargo.toml  (flowky)
[dependencies]
tauri = { version = "2", features = ["tray-icon", "notification"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
active-win-pos-rs = "0.8"   # cross-platform active window detection
```

```json
// package.json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-sql": "^2"
  }
}
```

## Requirements

### Functional requirements

Core timer

- [ ] Start a focus session with a named task and depth level (Light / Deep / Creative)
- [ ] Display a countdown ring showing time remaining
- [ ] Pause and resume a session
- [ ] Extend a session by 10 minutes (flow state)
- [ ] End a session early

Adaptive engine

- [ ] Suggest session length based on last 7 days of session data
- [ ] Score each day (0–100) based on completion rate, interruptions, and time-to-flow
- [ ] Adjust suggestion range: 15–90 minutes depending on pattern
- [ ] Weight recent sessions more heavily than older ones

Interruption tracking

- [ ] "Got distracted" button visible during active session
- [ ] Log interruption type: Slack/chat, in-person, checked another app, other
- [ ] Count interruptions per session and factor into daily score

Idle detection

- [ ] Detect when user has been away for 5 minutes via OS idle API
- [ ] Show animated overlay: "Hey — still there?"
- [ ] Progress bar showing 30-second countdown before auto-ending session
- [ ] Two actions: "I'm back, keep going" / "End session"
- [ ] At 15 min idle: softer message suggesting break logging
- [ ] At 30 min idle: auto-end and log as abandoned

Break timer

- [ ] Auto-suggest break length after session ends
- [ ] Show session quality rating (1–5) during break
- [ ] Rating feeds back into the adaptive scorer

Daily review

- [ ] Focus score for today with 7-day bar chart
- [ ] Total deep focus time
- [ ] Interruption count
- [ ] Per-session list: task name, duration, interruption count, dot colour by quality

System tray

- [ ] App lives in system tray — always one click away
- [ ] Tray icon updates to reflect session state (idle / running / break)
- [ ] Click tray icon to open/focus window

### Non-functional requirements

- [ ] App memory usage under 60 MB at idle
- [ ] Bundle size under 15 MB
- [ ] All data stored locally — no network calls in core app
- [ ] Works offline, always
- [ ] Supports macOS 12+, Windows 10+, Ubuntu 20.04+
- [ ] Respects system dark/light mode

## Context switching detection

Three tiers — ship Tier 1 by default, offer Tier 2 as opt-in during onboarding.


| Tier | Method              | Permission needed        | What it detects               |
| ---- | ------------------- | ------------------------ | ----------------------------- |
| 1    | Manual tap          | None                     | User self-reports distraction |
| 2    | OS window focus API | One-time consent         | App switches (any)            |
| 3    | Active app monitor  | Accessibility permission | App name (Slack vs VS Code)   |


### Tier 2 implementation per platform

```rust
// macOS: NSWorkspace didActivateApplicationNotification
// Windows: SetWinEventHook with EVENT_SYSTEM_FOREGROUND
// Linux: _NET_ACTIVE_WINDOW property change via X11

// Handled by active-win-pos-rs crate — one function call:
#[tauri::command]
fn get_active_window() -> String {
    active_win_pos_rs::get_active_window()
        .map(|w| w.app_name)
        .unwrap_or_default()
}
```

## Rust backend — commands

All Rust code lives in `src-tauri/src/`. Approximately 140 lines total across four modules.

```
src-tauri/src/
├── main.rs           # Tauri setup, registers all commands
├── watcher.rs        # OS active window + idle time (~30 lines)
├── notifications.rs  # OS notifications + tray icon updates (~20 lines)
├── db.rs             # SQLite schema + query helpers (~40 lines)
└── scorer.rs         # Weighted rolling average algorithm (~50 lines)
```

### Command surface (called from TypeScript via `invoke()`)

```rust
#[tauri::command] fn get_active_window() -> String
#[tauri::command] fn get_idle_seconds() -> u64
#[tauri::command] fn send_notification(title: String, body: String)
#[tauri::command] fn set_tray_state(state: String)  // "idle" | "running" | "break"
#[tauri::command] fn save_session(session: Session) -> Result<(), String>
#[tauri::command] fn get_sessions(days: u32) -> Result<Vec<Session>, String>
#[tauri::command] fn compute_score(sessions: Vec<Session>) -> f32
#[tauri::command] fn suggest_length(sessions: Vec<Session>) -> u32  // minutes
```

### SQLite schema

```sql
CREATE TABLE sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task        TEXT NOT NULL,
  depth       TEXT NOT NULL,              -- 'light' | 'deep' | 'creative'
  started_at  INTEGER NOT NULL,           -- unix timestamp
  ended_at    INTEGER,
  duration    INTEGER,                    -- seconds actually focused
  planned     INTEGER,                    -- seconds planned
  interrupts  INTEGER DEFAULT 0,
  rating      INTEGER,                    -- 1–5, nullable
  status      TEXT DEFAULT 'completed'   -- 'completed' | 'abandoned' | 'extended'
);
```

### Scoring algorithm

```rust
// scorer.rs
pub fn compute_score(sessions: &[Session]) -> f32 {
    // Weighted rolling average — recent sessions count more
    // Factors: completion rate, interruption density, rating average
    // Returns 0.0–100.0
    let weights: Vec<f32> = (0..sessions.len())
        .map(|i| 0.85_f32.powi(i as i32))
        .collect();

    let total_weight: f32 = weights.iter().sum();

    sessions.iter().zip(weights.iter())
        .map(|(s, w)| w * session_quality(s))
        .sum::<f32>() / total_weight
}

fn session_quality(s: &Session) -> f32 {
    let completion = (s.duration as f32 / s.planned as f32).min(1.0);
    let interrupt_penalty = (s.interrupts as f32 * 0.08).min(0.4);
    let rating_bonus = s.rating.map(|r| (r as f32 - 3.0) * 0.05).unwrap_or(0.0);
    ((completion - interrupt_penalty + rating_bonus) * 100.0).clamp(0.0, 100.0)
}
```

## Interface journey

### Screen 1 — Home / empty state

The app opens to a greeting with yesterday's focus score, session count, and total deep focus time. A single primary button: "Start a session". A footer note reminds the user the app lives in their system tray.

### Screen 2 — Task setup

User types a task name and selects a depth level (Light / Deep / Creative). The adaptive engine displays a suggested session length with a one-line explanation ("based on your last 7 days — you hit flow around 12 min on deep work"). They can accept the suggestion or pick 25 or 60 minutes manually.

### Screen 3 — Active session

A circular countdown ring dominates the screen. Task name and start time shown below. Three actions visible:

- Pause
- +10 min (extend for flow state)
- Got distracted (logs an interruption)
- Done early

### Screen 4 — Interruption log

Dark overlay or inline panel. Four interruption types as tap targets: Slack/chat, Someone stopped by, Checked another app, Other. One tap selects it. Buttons: "Resume session" / "End session". No typing required.

### Screen 5 — Break screen

Shows session summary: time focused, interruption count. A 1–5 quality rating (one tap). Break countdown shown as a small pill. Two actions: "Start next session" / "See today's review".

### Screen 6 — Idle overlay

Appears after 5 minutes of OS-level inactivity. Dark semi-transparent overlay with a pulsing ring animation. Copy: "Hey — still there? Your session is still running." A draining progress bar counts down 30 seconds before auto-ending. Buttons: "I'm back, keep going" / "End session".

### Screen 7 — Daily review

Focus score (0–100, colour-coded green/amber/red) with a 7-day bar chart. Three metric cards: deep focus time, interruption count, sessions completed. Per-session list with coloured dots (green = clean, coral = interrupted). Accessible from break screen or via tray menu.

## Project structure

```
flowky/
├── src/                        # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── screens/
│   │   ├── Home.tsx
│   │   ├── TaskSetup.tsx
│   │   ├── ActiveSession.tsx
│   │   ├── InterruptLog.tsx
│   │   ├── BreakScreen.tsx
│   │   ├── IdleOverlay.tsx
│   │   └── DailyReview.tsx
│   ├── hooks/
│   │   ├── useTimer.ts         # countdown logic
│   │   ├── useIdleWatcher.ts   # listens for 'user-idle' Tauri event
│   │   └── useSessions.ts      # read/write session data
│   ├── lib/
│   │   └── tauri.ts            # typed invoke() wrappers
│   └── styles/
│       └── globals.css
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── watcher.rs
│   │   ├── notifications.rs
│   │   ├── db.rs
│   │   └── scorer.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
└── README.md
```

## Build &amp; run

```bash
# Prerequisites: Node 18+, Rust (via rustup), Tauri CLI
npm install
npm run tauri dev       # development
npm run tauri build     # production binary — outputs as "Flowky"
```

Outputs a platform-native installer:

- macOS → `.dmg`
- Windows → `.msi` / `.exe`
- Linux → `.AppImage` / `.deb`

## Roadmap

### v1 — MVP

- [ ] Core timer with manual interruption tap
- [ ] SQLite session storage
- [ ] Basic scoring (completion rate only)
- [ ] System tray + OS notifications
- [ ] Idle overlay at 5 minutes
- [ ] Daily review screen

### v2 — Adaptive

- [ ] Full adaptive scoring (completion + interrupts + rating + time-of-day)
- [ ] OS window focus API for automatic context switch detection (Tier 2)
- [ ] Session length suggestions based on 7-day history
- [ ] Weekly summary view

### v3 — Insights

- [ ] Optional AI daily review via Anthropic API (on-demand, no background calls)
- [ ] Export sessions as CSV / JSON
- [ ] Calendar heatmap view
- [ ] Configurable interruption categories

## Privacy

All data is stored in a local SQLite file on the user's machine. No accounts. No telemetry. No network requests in the core app. The optional AI review in v3 is a single on-demand API call — never background, never automatic.

Tier 3 app classification: browser window titles are matched against keyword rules in-memory only and are never persisted to SQLite or any log. Unclassified titles surface in the current session's Daily Review and clear on the next session start. The `app_activity` table stores only app/site labels and dwell seconds — never raw titles.

Data location:

- macOS: `~/Library/Application Support/flowky/flowky.db`
- Windows: `%APPDATA%\flowky\flowky.db`
- Linux: `~/.local/share/flowky/flowky.db`

## License

MIT — open source, free to use, modify, and distribute.
