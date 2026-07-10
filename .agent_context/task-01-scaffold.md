## Goal

Bootstrap the Flowky desktop app from scratch: Tauri 2 + React 18 + TypeScript + Vite.

## Acceptance criteria

- [ ] `package.json` with React 18, Vite, `@tauri-apps/api` v2, `@tauri-apps/plugin-sql` v2
- [ ] `src-tauri/Cargo.toml` with `tauri` (tray-icon, notification features), `tauri-plugin-sql` (sqlite)
- [ ] `tauri.conf.json` configured for app name "Flowky", window size appropriate for a timer UI
- [ ] Folder structure matches CLAUDE.md:
  - `src/` with `App.tsx`, `main.tsx`, `screens/`, `hooks/`, `lib/`, `styles/`
  - `src-tauri/src/` with stub modules: `main.rs`, `watcher.rs`, `notifications.rs`, `db.rs`, `scorer.rs`
- [ ] `npm run tauri dev` launches a blank React shell without errors
- [ ] `README.md` with build/run instructions from CLAUDE.md

## Reference

See project spec in `CLAUDE.md` — Stack, Project structure, Build & run sections.

## Notes

- No feature logic yet — stubs only. Backend and UI tasks follow this scaffold.
- All data stays local; no network calls in core app.
