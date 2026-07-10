use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use system_idle_time::get_idle_time;
use tauri::{AppHandle, Emitter, Manager};

use crate::db::{lookup_app_bucket, lookup_site_bucket, AppActivityInput, DbState};

const IDLE_THRESHOLD_SECS: u64 = 5 * 60;
const IDLE_POLL_INTERVAL_SECS: u64 = 5;
const CONTEXT_SWITCH_POLL_INTERVAL_SECS: u64 = 1;
const DISTRACTION_DWELL_THRESHOLD_SECS: u64 = 5;
const NUDGE_COOLDOWN_SECS: u64 = 60;

/// Browser app names whose window title is matched against site_rules.
const BROWSER_APPS: &[&str] = &[
    "Safari",
    "Google Chrome",
    "Firefox",
    "Microsoft Edge",
    "Arc",
    "Brave Browser",
    "Brave",
];

const BROWSER_OTHER_LABEL: &str = "Browser (other)";

static CONTEXT_WATCH_ENABLED: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Serialize)]
pub struct SessionTitle {
    pub title: String,
    pub seconds: i64,
}

#[derive(Clone, Serialize)]
pub struct LiveDistraction {
    pub app: String,
    pub seconds: i64,
}

/// In-memory, session-scoped app/browsing state. Raw browser titles live ONLY
/// here and are never persisted — see the privacy section in the spec.
#[derive(Default)]
struct AppSessionState {
    /// label -> (bucket, accumulated seconds), persisted at session end.
    dwell: HashMap<String, (String, u64)>,
    /// unmatched browser raw title -> seconds, current session only.
    titles: HashMap<String, u64>,
    /// label currently in the foreground and how long continuously, for nudges.
    current_label: Option<String>,
    current_streak: u64,
    /// label -> unix secs of the last nudge, for cooldown.
    last_nudge: HashMap<String, i64>,
}

static APP_STATE: Mutex<Option<AppSessionState>> = Mutex::new(None);

#[tauri::command]
pub fn get_idle_seconds() -> u64 {
    get_idle_time()
        .map(|idle| idle.as_secs())
        .unwrap_or(0)
}

#[tauri::command]
pub fn get_active_window() -> String {
    active_app_name()
}

#[tauri::command]
pub fn set_context_switch_watching(enabled: bool) {
    eprintln!("[watcher] set_context_switch_watching({enabled})");
    CONTEXT_WATCH_ENABLED.store(enabled, Ordering::SeqCst);
}

/// Reset all in-memory tracking. Called when a focus session starts.
#[tauri::command]
pub fn start_app_session() {
    eprintln!("[watcher] start_app_session");
    *APP_STATE.lock().unwrap() = Some(AppSessionState::default());
}

/// Drain the accumulated per-app dwell into rows for persistence. Clears the
/// dwell map but keeps session titles available for the review screen.
#[tauri::command]
pub fn take_app_activity() -> Vec<AppActivityInput> {
    let mut guard = APP_STATE.lock().unwrap();
    let Some(state) = guard.as_mut() else {
        return Vec::new();
    };
    state
        .dwell
        .drain()
        .map(|(app_name, (bucket, seconds))| AppActivityInput {
            app_name,
            bucket,
            seconds: seconds as i64,
        })
        .collect()
}

/// Live per-app distraction dwell for the current session, busiest first.
/// Read-only — does not drain the accumulator.
#[tauri::command]
pub fn get_live_distractions() -> Vec<LiveDistraction> {
    let guard = APP_STATE.lock().unwrap();
    let Some(state) = guard.as_ref() else {
        return Vec::new();
    };
    let mut rows: Vec<LiveDistraction> = state
        .dwell
        .iter()
        .filter(|(_, (bucket, _))| bucket == "distraction")
        .map(|(label, (_, seconds))| LiveDistraction {
            app: label.clone(),
            seconds: *seconds as i64,
        })
        .collect();
    rows.sort_by(|a, b| b.seconds.cmp(&a.seconds));
    rows
}

/// Unmatched browser titles seen during the current session, busiest first.
#[tauri::command]
pub fn get_session_titles() -> Vec<SessionTitle> {
    let guard = APP_STATE.lock().unwrap();
    let Some(state) = guard.as_ref() else {
        return Vec::new();
    };
    let mut titles: Vec<SessionTitle> = state
        .titles
        .iter()
        .map(|(title, seconds)| SessionTitle {
            title: title.clone(),
            seconds: *seconds as i64,
        })
        .collect();
    titles.sort_by(|a, b| b.seconds.cmp(&a.seconds));
    titles
}

fn active_app_name() -> String {
    active_win_pos_rs::get_active_window()
        .map(|window| window.app_name)
        .unwrap_or_default()
}

fn active_app() -> Option<(String, String)> {
    active_win_pos_rs::get_active_window()
        .ok()
        .map(|w| (w.app_name, w.title))
}

fn is_browser(app_name: &str) -> bool {
    BROWSER_APPS.iter().any(|b| b.eq_ignore_ascii_case(app_name))
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Classify the foreground window into (label, bucket, optional raw title to
/// remember). The raw title is returned only for unmatched browser pages.
fn classify(db: &DbState, app_name: &str, title: &str) -> (String, String, Option<String>) {
    if is_browser(app_name) {
        match lookup_site_bucket(db, title) {
            Some((keyword, bucket)) => (format!("{keyword} (web)"), bucket, None),
            None => (
                BROWSER_OTHER_LABEL.to_string(),
                "neutral".to_string(),
                if title.is_empty() {
                    None
                } else {
                    Some(title.to_string())
                },
            ),
        }
    } else {
        let bucket = lookup_app_bucket(db, app_name);
        (app_name.to_string(), bucket, None)
    }
}

pub fn start_idle_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let mut idle_event_sent = false;

        loop {
            std::thread::sleep(Duration::from_secs(IDLE_POLL_INTERVAL_SECS));

            let idle_secs = get_idle_seconds();
            if idle_secs >= IDLE_THRESHOLD_SECS {
                if !idle_event_sent {
                    let _ = app.emit("user-idle", idle_secs);
                    idle_event_sent = true;
                }
            } else {
                idle_event_sent = false;
            }
        }
    });
}

pub fn start_context_switch_watcher(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(CONTEXT_SWITCH_POLL_INTERVAL_SECS));

        if !CONTEXT_WATCH_ENABLED.load(Ordering::SeqCst) {
            eprintln!("[watcher] poll: disabled (CONTEXT_WATCH_ENABLED=false)");
            continue;
        }

        let Some((app_name, title)) = active_app() else {
            eprintln!("[watcher] poll: active_app() returned None (permission?)");
            continue;
        };
        if app_name.is_empty() {
            eprintln!("[watcher] poll: empty app_name (permission?)");
            continue;
        }

        let db = app.state::<DbState>();
        let (label, bucket, raw_title) = classify(&db, &app_name, &title);
        eprintln!(
            "[watcher] poll: app={app_name:?} title={title:?} -> label={label:?} bucket={bucket}"
        );

        let mut guard = APP_STATE.lock().unwrap();
        let Some(state) = guard.as_mut() else {
            eprintln!("[watcher] poll: APP_STATE is None (start_app_session not called?)");
            continue;
        };

        let step = CONTEXT_SWITCH_POLL_INTERVAL_SECS;

        // Accumulate dwell for the review breakdown.
        let entry = state
            .dwell
            .entry(label.clone())
            .or_insert_with(|| (bucket.clone(), 0));
        entry.0 = bucket.clone();
        entry.1 += step;

        // Remember unmatched browser titles in-memory only.
        if let Some(t) = raw_title {
            *state.titles.entry(t).or_insert(0) += step;
        }

        // Track the continuous streak on the current label for nudging.
        if state.current_label.as_deref() == Some(label.as_str()) {
            state.current_streak += step;
        } else {
            state.current_label = Some(label.clone());
            state.current_streak = step;
        }

        if bucket == "distraction" && state.current_streak >= DISTRACTION_DWELL_THRESHOLD_SECS {
            let now = now_secs();
            let due = state
                .last_nudge
                .get(&label)
                .map(|last| now - last >= NUDGE_COOLDOWN_SECS as i64)
                .unwrap_or(true);
            eprintln!("[watcher] distraction streak={}s due={due}", state.current_streak);
            if due {
                state.last_nudge.insert(label.clone(), now);
                eprintln!("[watcher] show nudge for {label:?}");
                let _ = app.emit("app-distraction", label.clone());
                crate::notifications::show_nudge(&app, &label);
            }
        }
    });
}
