# Tier 3 — Active App Classification + Time Tracking

**Date:** 2026-06-23
**Status:** Approved

## Goal

During an active focus session, detect which application (and, for browsers,
which site) is currently in the foreground, classify it as work / distraction /
neutral, gently nudge the user when they linger on a distraction, and record
time-per-app so the Daily Review can show a work-vs-distraction split.

This extends the existing Tier 2 watcher (which only fired once when the user
left Flowky) into full Tier 3 continuous app awareness.

## Decisions

1. **Behavior on distraction:** gentle OS notification only. No auto-logged
   interruption. User stays in control. Scoring untouched in v1.
2. **Classification:** preset rule lists, editable in Settings. Unknown apps =
   neutral. No first-seen prompts.
3. **Tracking depth:** full time-per-app per session, surfaced in Daily Review.
4. **Browser titles:** keyword substring match against `site_rules`.
   - Match → tracked under keyword label (e.g. `"YouTube (web)"`).
   - No match → bucket neutral, DB label `"Browser (other)"`; raw title kept
     in-memory for the current session only, shown in review, never persisted.

## Privacy

- Raw browser window titles are processed in-memory and keyword-matched only.
- `app_activity` stores keyword labels or `"Browser (other)"` — never raw titles.
- Unmatched titles surface in the current-session review and are cleared on the
  next session start. They never touch the database or any log.
- README / CLAUDE privacy section updated to state this.

## Data model (`db.rs`)

```sql
CREATE TABLE IF NOT EXISTS app_rules (
    app_name TEXT PRIMARY KEY,
    bucket   TEXT NOT NULL          -- 'work' | 'distraction' | 'neutral'
);

CREATE TABLE IF NOT EXISTS site_rules (
    keyword TEXT PRIMARY KEY,       -- matched as case-insensitive substring of window title
    bucket  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    app_name   TEXT NOT NULL,       -- app display name or site label; never a raw title
    bucket     TEXT NOT NULL,
    seconds    INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

Seed `app_rules` and `site_rules` on init only when empty.

### Preset seeds

- **app_rules distraction:** Slack, Discord, Messages, Telegram, WhatsApp,
  Twitter, X, Mail, TikTok, Reddit
- **app_rules work:** Code, Visual Studio Code, Terminal, iTerm2, Figma, Xcode,
  Notion, Obsidian
- **site_rules distraction:** youtube, twitter, x.com, reddit, facebook,
  instagram, tiktok, netflix
- **site_rules work:** github, stack overflow, localhost, jira, confluence, docs
- Everything else = neutral (including un-ruled browsers).

### DB commands

- `get_app_rules() -> Vec<AppRule>`
- `set_app_rule(app_name, bucket)`
- `get_site_rules() -> Vec<SiteRule>`
- `set_site_rule(keyword, bucket)`
- `save_app_activity(session_id, rows)` — bulk insert at session end
- `get_app_activity(days) -> Vec<AppActivityTotal>` — grouped totals for review

## Watcher (`watcher.rs`)

Continuous tracking while a session is active and Tier 3 is enabled:

- Poll active app every 2s (existing interval).
- Classification:
  - Browser app (Safari, Google Chrome, Firefox, Microsoft Edge, Arc, Brave) →
    read `window.title`, substring-match `site_rules`. Match → label = keyword,
    its bucket. No match → neutral, label `"Browser (other)"`, push raw title to
    in-memory session-titles list.
  - Non-browser → match `app_rules` by app name. Unknown → neutral.
- Accumulate dwell seconds per (label, bucket) in an in-memory session map.
- Distraction-bucket dwell crosses 15s threshold → emit `app-distraction`
  {label} once, then 60s cooldown.
- In-memory session-titles list holds unmatched browser raw titles for the
  current session.

### Watcher commands / lifecycle

- `set_context_switch_watching(enabled)` — reused, now gates Tier 3.
- `start_app_session()` — clear dwell map + session-titles, called on session start.
- `flush_app_activity(session_id)` — persist dwell map to `app_activity`,
  called by frontend after `save_session`.
- `get_session_titles() -> Vec<SessionTitle>` — current-session unmatched titles.

## Frontend

- `useContextSwitchWatcher` → `useAppWatcher`. Listen `app-distraction` →
  `sendNotification("Off track", "<label> isn't your focus task — back to it?")`.
  Cooldown enforced server-side.
- `ActiveSession` save flow → call `flush_app_activity(sessionId)` after save;
  `start_app_session()` on session start.
- `Settings` → app-rules + site-rules editors: list rules, toggle bucket
  work/distraction/neutral, add manual entries.
- `DailyReview` → new card: work-vs-distraction time split + top distraction
  labels from `get_app_activity(1)`; "This session's browsing" list from
  `get_session_titles()` (current session only).
- `tauri.ts` → typed wrappers for all new commands.

## Plumbing

- Register new commands in `lib.rs` invoke_handler.
- macOS Accessibility permission required for window title (Tier 3). Update
  onboarding copy on the existing Tier toggle (`getAutoDetectContextSwitch`
  reused).

## Out of scope (YAGNI, v1)

- Scoring changes from distraction time (display only).
- Domain/URL extraction (title keyword match only).
- First-seen classification prompts.
- Persisting raw browser titles.
```
