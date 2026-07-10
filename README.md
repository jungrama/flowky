# Flowky

> A clock that bends to your flow.

Flowky is a native desktop focus timer that adapts to how you actually work. Built with Tauri 2, React 18, and TypeScript — fully local, no account required.

## Prerequisites

- Node.js 18+
- Rust (via [rustup](https://rustup.rs/))
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

## Build & run

```bash
npm install
npm run tauri dev       # development
npm run tauri build     # production binary — outputs as "Flowky"
```

Production builds produce platform-native installers:

- macOS → `.dmg`
- Windows → `.msi` / `.exe`
- Linux → `.AppImage` / `.deb`

## Project structure

```
flowky/
├── src/                        # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── screens/
│   ├── hooks/
│   ├── lib/
│   └── styles/
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── watcher.rs
│   │   ├── notifications.rs
│   │   ├── db.rs
│   │   └── scorer.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

## Privacy

All session data is stored locally in SQLite. No accounts, no telemetry, no network calls in the core app.

Browser window titles used for site classification are matched against keyword rules **in-memory only** and are never written to the database or any log. Unclassified page titles surface in the current session's Daily Review and are cleared when the next session starts.

Data location:

- macOS: `~/Library/Application Support/com.flowky.app/flowky.db`
- Windows: `%APPDATA%\com.flowky.app\flowky.db`
- Linux: `~/.local/share/com.flowky.app/flowky.db`

### Exporting your data

From **Today's review**, use **Export data** to save your full session history as JSON or CSV. The native save dialog lets you pick the format and destination — the file is written directly to disk with no network calls.

Exported fields match the local database: task, depth, timestamps, duration, planned length, interruptions, rating, and status.

## Automatic distraction detection (Tier 3)

Optional feature — off by default. Enable from Settings to watch which app and browser site are in focus during an active session. Apps and sites are classified as **work**, **distraction**, or **neutral** (editable in Settings → App & site classification). Linger on a distraction past 15 seconds and Flowky sends a gentle OS notification — it never auto-logs an interruption. Time per app is recorded and shown as a work-vs-distraction split in Daily Review. Manual **Got distracted** (Tier 1) always works alongside it.

### OS permissions

| Platform | Permission | Notes |
| -------- | ---------- | ----- |
| macOS | Accessibility (System Settings → Privacy & Security → Accessibility) | Required for `active-win-pos-rs` to read the foreground app name and window title. If denied, `get_active_window()` returns empty and automatic detection is skipped — manual logging still works. |
| Windows | None typically | Foreground window detection works without extra consent. |
| Linux (X11) | None typically | Uses `_NET_ACTIVE_WINDOW`. Wayland support varies by compositor. |

Flowky only checks the active app name while a session is running and you have opted in. No background monitoring when idle.

## License

MIT
