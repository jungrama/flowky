# Flowky

> A clock that bends to your flow.

![Flowky](./demo/demo.png)

Flowky is a native macOS focus timer that adapts to how you actually work. Built with Tauri 2, React 18, TypeScript, Tailwind CSS 4, and shadcn/ui — fully local, no account required.

## Demo

https://github.com/user-attachments/assets/7f4ba0d3-996c-48cf-b9bf-1f175d2bdc9b

## Prerequisites

- Node.js 18+
- Rust (via [rustup](https://rustup.rs/))
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for macOS (Xcode Command Line Tools)

## Build & run

```bash
npm install
npm run tauri dev       # development
npm run tauri build     # production binary — outputs as "Flowky"
```

`npm run tauri build` produces a macOS `.dmg` / `.app`.

### Installing a downloaded build

Flowky is distributed **unsigned** (no paid Apple Developer certificate), so macOS Gatekeeper will warn on first launch. To open it:

1. Drag **Flowky** to `/Applications`.
2. Right-click the app → **Open** → **Open** in the dialog (only needed once).

If macOS still blocks it, clear the quarantine flag:

```bash
xattr -dr com.apple.quarantine /Applications/Flowky.app
```

## Features

- **Adaptive timer** — a tape-ruler picker suggests a session length from your recent history; drag to adjust. Pause, extend +10 min, or end early.
- **Tasks** — a simple local todo list (add / rename / complete / delete). Pick a task to focus on from the "Tasks" tab or straight from the timer's task field.
- **Interruptions** — tap "Got distracted" to log an interruption by type.
- **Idle detection** — after 5 minutes of OS-level inactivity an overlay checks you're still there before auto-ending the session.
- **Break screen** — post-session summary with a 1–5 quality rating and a suggested break, plus a confetti send-off on a finished session.
- **Daily & weekly review** — focus score, 7-day chart, deep-focus time, interruptions, per-session detail (tap a row for a bottom-sheet breakdown), and a monthly heatmap calendar.
- **System tray** — a menubar popover mirrors the live timer and controls; the tray title shows the running countdown.

## Project structure

```
flowky/
├── src/                        # React frontend
│   ├── App.tsx                 # screen router + session state
│   ├── main.tsx                # entry; renders main / popover / nudge windows
│   ├── screens/                # Home, FocusTimer, BreakScreen, DailyReview,
│   │                           #   WeeklySummary, CalendarHeatmap, InterruptLog,
│   │                           #   IdleOverlay, Settings, Tasks, Popover, Nudge
│   ├── components/             # AppNav, SessionItem, TaskList/TaskDrawer,
│   │   └── ui/                 #   settings panels, mascots + shadcn/ui primitives
│   ├── hooks/                  # useTimer, useSessions, useTasks, idle/app watchers
│   ├── lib/                    # tauri invoke wrappers, scoring/stats, utils
│   └── styles/app.css          # Tailwind v4 + theme tokens
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── lib.rs              # setup + command registration
│   │   ├── db.rs              # SQLite: sessions, interruptions, rules, activity, tasks
│   │   ├── watcher.rs         # idle + active-app / distraction detection
│   │   ├── notifications.rs   # tray, popover, distraction nudge
│   │   ├── permissions.rs     # macOS permission checks
│   │   └── scorer.rs          # focus score + length suggestion
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

## Privacy

All session data is stored locally in SQLite. No accounts, no telemetry, no network calls.

Browser window titles used for site classification are matched against keyword rules **in-memory only** — they are never written to the database or any log.

Data location: `~/Library/Application Support/com.flowky.app/flowky.db`

## Automatic distraction detection (Tier 3)

Optional — off by default. Enable from **Settings → Distractions** to watch which app or browser site is in focus during an active session. Apps and sites are classified as **work**, **distraction**, or **neutral** (editable in the same panel). Linger on a distraction for a few seconds and Flowky pops a gentle nudge card — it never auto-logs an interruption. Time per app is recorded and shown as a distraction breakdown in Daily Review. Manual **Got distracted** (Tier 1) always works alongside it.

### macOS permission

Automatic detection needs **Accessibility** access (System Settings → Privacy & Security → Accessibility) so `active-win-pos-rs` can read the foreground app name and window title. If denied, automatic detection is skipped — manual logging still works. Flowky only checks the active app while a session is running and you have opted in.

## Versioning & changelog

Flowky follows [Semantic Versioning](https://semver.org/). The version is kept
in sync across `package.json`, `src-tauri/Cargo.toml`, and
`src-tauri/tauri.conf.json`. See [CHANGELOG.md](./CHANGELOG.md) for release
notes.

## License

MIT — see [LICENSE](./LICENSE).
