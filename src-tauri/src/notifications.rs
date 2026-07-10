use std::sync::Mutex;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, State,
};
use tauri_plugin_notification::NotificationExt;

const TRAY_ID: &str = "main";

/// Live snapshot of the current session, shared with the tray popover window.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TraySession {
    pub active: bool,
    pub task: String,
    pub depth: String,
    /// "running" | "paused" | "break" | "idle"
    pub status: String,
    pub remaining_seconds: i64,
    pub planned_seconds: i64,
    pub started_at: i64,
    pub interrupts: i64,
    /// Epoch seconds when the running timer hits zero. None unless running.
    pub ends_at: Option<i64>,
}

impl Default for TraySession {
    fn default() -> Self {
        TraySession {
            active: false,
            task: String::new(),
            depth: String::new(),
            status: "idle".to_string(),
            remaining_seconds: 0,
            planned_seconds: 0,
            started_at: 0,
            interrupts: 0,
            ends_at: None,
        }
    }
}

/// Tauri-managed holder for the latest [`TraySession`].
pub struct TraySessionState(pub Mutex<TraySession>);

impl Default for TraySessionState {
    fn default() -> Self {
        TraySessionState(Mutex::new(TraySession::default()))
    }
}

/// Called from the frontend whenever the session changes. Stores the snapshot
/// and pushes it to the popover so an open popover updates live.
#[tauri::command]
pub fn update_tray_session(
    app: AppHandle,
    state: State<'_, TraySessionState>,
    session: TraySession,
) {
    *state.0.lock().unwrap() = session.clone();
    let _ = app.emit_to("popover", "tray-session", session);
}

/// Read the current snapshot — popover calls this on open.
#[tauri::command]
pub fn get_tray_session(state: State<'_, TraySessionState>) -> TraySession {
    state.0.lock().unwrap().clone()
}

/// Popover "Open app" button: focus the main window and close the popover.
#[tauri::command]
pub fn open_main_window(app: AppHandle) {
    focus_main_window(&app);
    if let Some(popover) = app.get_webview_window("popover") {
        let _ = popover.hide();
    }
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn format_clock(total: i64) -> String {
    let s = total.max(0);
    format!("{}:{:02}", s / 60, s % 60)
}

/// Background ticker: shows the live countdown as the tray title (macOS
/// menubar) while a session runs. Other platforms ignore the title.
pub fn start_tray_timer(app: AppHandle) {
    thread::spawn(move || {
        let mut last: Option<String> = None;
        loop {
            thread::sleep(Duration::from_secs(1));

            let snapshot = {
                let state = app.state::<TraySessionState>();
                let guard = state.0.lock().unwrap();
                guard.clone()
            };

            // Only show the countdown while actively running — no lingering
            // text when paused, on break, or with no session.
            let title = match snapshot.status.as_str() {
                "running" => {
                    let remaining = snapshot
                        .ends_at
                        .map(|e| (e - now_secs()).max(0))
                        .unwrap_or(snapshot.remaining_seconds);
                    Some(format_clock(remaining))
                }
                _ => None,
            };

            if title == last {
                continue;
            }
            if let Some(tray) = app.tray_by_id(TRAY_ID) {
                // Pass an empty string (not None) so macOS actually clears the
                // menubar title — None leaves the previous countdown lingering.
                let _ = tray.set_title(Some(title.as_deref().unwrap_or("")));
            }
            last = title;
        }
    });
}

fn toggle_popover(app: &AppHandle, rect: tauri::Rect) {
    let Some(popover) = app.get_webview_window("popover") else {
        return;
    };

    if popover.is_visible().unwrap_or(false) {
        let _ = popover.hide();
        return;
    }

    let scale = popover.scale_factor().unwrap_or(1.0);
    let icon_pos = rect.position.to_physical::<i32>(scale);
    let icon_size = rect.size.to_physical::<i32>(scale);
    let win_size = popover
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new(280, 180));

    // Centre the popover under the tray icon (macOS menubar lives at the top).
    let x = icon_pos.x + icon_size.width / 2 - win_size.width as i32 / 2;
    let y = icon_pos.y + icon_size.height;

    let _ = popover.set_position(PhysicalPosition::new(x, y));
    let _ = popover.show();
    let _ = popover.set_focus();
}

/// Show the cute distraction nudge, positioned top-right just under the menubar
/// where the tray icon lives. Does not steal focus from the user's current app.
pub fn show_nudge(app: &AppHandle, label: &str) {
    let Some(nudge) = app.get_webview_window("nudge") else {
        return;
    };

    if let Ok(Some(monitor)) = nudge.primary_monitor() {
        let scale = monitor.scale_factor();
        let size = monitor.size();
        let pos = monitor.position();
        let win = nudge
            .outer_size()
            .unwrap_or(tauri::PhysicalSize::new(300, 170));
        let margin = (12.0 * scale) as i32;
        let top = (36.0 * scale) as i32; // below the macOS menubar
        let x = pos.x + size.width as i32 - win.width as i32 - margin;
        let y = pos.y + top;
        let _ = nudge.set_position(PhysicalPosition::new(x, y));
    }

    let _ = nudge.emit("nudge-show", label.to_string());
    let _ = nudge.show();
}

fn tray_icon_for_state(state: &str) -> Result<Image<'static>, String> {
    let bytes: &[u8] = match state {
        "running" => include_bytes!("../icons/tray-running.png"),
        "break" => include_bytes!("../icons/tray-break.png"),
        _ => include_bytes!("../icons/tray-idle.png"),
    };
    Image::from_bytes(bytes).map_err(|e| e.to_string())
}

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show Flowky", true, None::<&str>)?;
    let daily_review =
        MenuItem::with_id(app, "daily_review", "Daily Review", true, None::<&str>)?;
    let weekly_summary =
        MenuItem::with_id(app, "weekly_summary", "Weekly Summary", true, None::<&str>)?;
    let calendar =
        MenuItem::with_id(app, "calendar", "Focus Calendar", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &daily_review, &weekly_summary, &calendar, &quit])?;

    let icon = tray_icon_for_state("idle")?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .icon_as_template(true) // monochrome — adapts to light/dark menubar (macOS)
        .tooltip("Flowky — Idle")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => focus_main_window(app),
            "daily_review" => open_daily_review(app),
            "weekly_summary" => open_weekly_summary(app),
            "calendar" => open_calendar_heatmap(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                toggle_popover(tray.app_handle(), rect);
            }
        })
        .build(app)?;

    Ok(())
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn open_daily_review(app: &AppHandle) {
    focus_main_window(app);
    let _ = app.emit("navigate-daily-review", ());
}

fn open_weekly_summary(app: &AppHandle) {
    focus_main_window(app);
    let _ = app.emit("navigate-weekly-summary", ());
}

fn open_calendar_heatmap(app: &AppHandle) {
    focus_main_window(app);
    let _ = app.emit("navigate-calendar-heatmap", ());
}

#[tauri::command]
pub fn send_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_tray_state(app: AppHandle, state: String) -> Result<(), String> {
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| "tray icon not initialized".to_string())?;

    let tooltip = match state.as_str() {
        "running" => "Flowky — Focus session",
        "break" => "Flowky — Break",
        _ => "Flowky — Idle",
    };

    let icon = tray_icon_for_state(&state)?;
    tray.set_icon(Some(icon))
        .and_then(|_| tray.set_icon_as_template(true))
        .and_then(|_| tray.set_tooltip(Some(tooltip)))
        .map_err(|e| e.to_string())
}
