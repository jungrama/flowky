use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Status of the OS permissions Tier 3 detection relies on.
/// Values: "granted" | "denied" | "unsupported" | "unknown".
#[derive(Serialize)]
pub struct PermissionStatus {
    pub screen_recording: String,
    pub notifications: String,
}

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGPreflightScreenCaptureAccess() -> bool;
    fn CGRequestScreenCaptureAccess() -> bool;
}

#[cfg(target_os = "macos")]
fn screen_recording_status() -> String {
    // Reading another app's window title goes through CGWindowList, which needs
    // Screen Recording on macOS 10.15+. Preflight checks without prompting.
    if unsafe { CGPreflightScreenCaptureAccess() } {
        "granted".to_string()
    } else {
        "denied".to_string()
    }
}

#[cfg(not(target_os = "macos"))]
fn screen_recording_status() -> String {
    // Windows / Linux read the foreground window without a dedicated permission.
    "unsupported".to_string()
}

#[tauri::command]
pub fn get_permission_status() -> PermissionStatus {
    PermissionStatus {
        screen_recording: screen_recording_status(),
        // The notification plugin reports "granted" unconditionally on desktop,
        // so it carries no real signal — surface "unknown" and let the user
        // verify with a live test notification instead.
        notifications: "unknown".to_string(),
    }
}

/// Trigger the macOS Screen Recording prompt (adds Flowky to the list). The OS
/// only applies a newly-granted permission after the app restarts.
#[tauri::command]
pub fn request_screen_recording() {
    #[cfg(target_os = "macos")]
    unsafe {
        let _ = CGRequestScreenCaptureAccess();
    }
}

/// Open the relevant System Settings pane. `target`: "screen-recording" | "notifications".
#[tauri::command]
pub fn open_system_settings(target: String) {
    #[cfg(target_os = "macos")]
    {
        let url = match target.as_str() {
            "screen-recording" => {
                "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
            }
            "notifications" => "x-apple.systempreferences:com.apple.preference.notifications",
            _ => "x-apple.systempreferences:",
        };
        let _ = std::process::Command::new("open").arg(url).spawn();
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = target;
    }
}

/// Fire a test notification so the user can confirm notifications reach them.
#[tauri::command]
pub fn send_test_notification(app: AppHandle) -> Result<(), String> {
    app.notification()
        .builder()
        .title("Flowky")
        .body("Test notification — you're all set.")
        .show()
        .map_err(|e| e.to_string())
}
