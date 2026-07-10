mod db;
mod notifications;
mod permissions;
mod scorer;
mod watcher;

use db::{
    add_task, delete_task, get_app_activity, get_app_rules, get_interruption_breakdown,
    get_session_app_activity, get_sessions, get_site_rules, get_tasks, init_db, reset_data,
    save_app_activity, save_session, set_app_rule, set_site_rule, update_task,
};
use notifications::{
    get_tray_session, open_main_window, send_notification, set_tray_state, setup_tray,
    start_tray_timer, update_tray_session, TraySessionState,
};
use permissions::{
    get_permission_status, open_system_settings, request_screen_recording, send_test_notification,
};
use scorer::{compute_score, suggest_length};
use tauri::Manager;
use watcher::{
    get_idle_seconds, get_live_distractions,
    set_context_switch_watching, start_app_session, start_context_switch_watcher,
    start_idle_watcher, take_app_activity,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let handle = app.handle().clone();
            app.manage(init_db(&handle)?);
            app.manage(TraySessionState::default());
            setup_tray(&handle).map_err(|e| e.to_string())?;
            start_tray_timer(handle.clone());
            start_idle_watcher(handle.clone());
            start_context_switch_watcher(handle);

            if let Some(window) = app.get_webview_window("main") {
                window.clone().on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                });
            }

            // Hide the popover when it loses focus (click-outside to dismiss).
            if let Some(popover) = app.get_webview_window("popover") {
                popover.clone().on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = popover.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_idle_seconds,
            set_context_switch_watching,
            send_notification,
            set_tray_state,
            update_tray_session,
            get_tray_session,
            open_main_window,
            save_session,
            get_sessions,
            reset_data,
            get_interruption_breakdown,
            compute_score,
            suggest_length,
            start_app_session,
            take_app_activity,
            get_live_distractions,
            get_app_rules,
            set_app_rule,
            get_site_rules,
            set_site_rule,
            save_app_activity,
            get_app_activity,
            get_session_app_activity,
            get_permission_status,
            request_screen_recording,
            open_system_settings,
            send_test_notification,
            get_tasks,
            add_task,
            update_task,
            delete_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
