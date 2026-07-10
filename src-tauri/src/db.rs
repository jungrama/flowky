use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: Option<i64>,
    pub task: String,
    pub depth: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub duration: Option<i64>,
    pub planned: i64,
    pub interrupts: i64,
    pub rating: Option<i64>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterruptionInput {
    pub interrupt_type: String,
    pub logged_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterruptionBreakdown {
    pub interrupt_type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppRule {
    pub app_name: String,
    pub bucket: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteRule {
    pub keyword: String,
    pub bucket: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppActivityInput {
    pub app_name: String,
    pub bucket: String,
    pub seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppActivityTotal {
    pub app_name: String,
    pub bucket: String,
    pub seconds: i64,
}

pub struct DbState {
    conn: Mutex<Connection>,
}

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    depth TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    duration INTEGER,
    planned INTEGER NOT NULL,
    interrupts INTEGER DEFAULT 0,
    rating INTEGER,
    status TEXT DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS interruptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    logged_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS app_rules (
    app_name TEXT PRIMARY KEY,
    bucket   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_rules (
    keyword TEXT PRIMARY KEY,
    bucket  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    app_name   TEXT NOT NULL,
    bucket     TEXT NOT NULL,
    seconds    INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
";

/// (app_name, bucket) preset rules seeded when `app_rules` is empty.
const APP_RULE_SEEDS: &[(&str, &str)] = &[
    ("Slack", "distraction"),
    ("Discord", "distraction"),
    ("Messages", "distraction"),
    ("Telegram", "distraction"),
    ("WhatsApp", "distraction"),
    ("Twitter", "distraction"),
    ("X", "distraction"),
    ("Mail", "distraction"),
    ("TikTok", "distraction"),
    ("Reddit", "distraction"),
    ("Code", "work"),
    ("Visual Studio Code", "work"),
    ("Terminal", "work"),
    ("iTerm2", "work"),
    ("Figma", "work"),
    ("Xcode", "work"),
    ("Notion", "work"),
    ("Obsidian", "work"),
];

/// (keyword, bucket) preset rules seeded when `site_rules` is empty.
const SITE_RULE_SEEDS: &[(&str, &str)] = &[
    ("youtube", "distraction"),
    ("twitter", "distraction"),
    ("x.com", "distraction"),
    ("reddit", "distraction"),
    ("facebook", "distraction"),
    ("instagram", "distraction"),
    ("tiktok", "distraction"),
    ("netflix", "distraction"),
    ("github", "work"),
    ("stack overflow", "work"),
    ("localhost", "work"),
    ("jira", "work"),
    ("confluence", "work"),
    ("docs", "work"),
];

fn seed_rules(conn: &Connection) -> Result<(), String> {
    let app_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_rules", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if app_count == 0 {
        for (name, bucket) in APP_RULE_SEEDS {
            conn.execute(
                "INSERT INTO app_rules (app_name, bucket) VALUES (?1, ?2)",
                params![name, bucket],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let site_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM site_rules", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if site_count == 0 {
        for (keyword, bucket) in SITE_RULE_SEEDS {
            conn.execute(
                "INSERT INTO site_rules (keyword, bucket) VALUES (?1, ?2)",
                params![keyword, bucket],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn init_db(app: &AppHandle) -> Result<DbState, String> {
    let db_path = app
        .path()
        .resolve("flowky.db", tauri::path::BaseDirectory::AppData)
        .map_err(|e| e.to_string())?;

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;
    seed_rules(&conn)?;

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}

fn insert_interruptions(
    conn: &Connection,
    session_id: i64,
    interruptions: &[InterruptionInput],
) -> Result<(), String> {
    for interruption in interruptions {
        conn.execute(
            "INSERT INTO interruptions (session_id, type, logged_at) VALUES (?1, ?2, ?3)",
            params![
                session_id,
                interruption.interrupt_type,
                interruption.logged_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn save_session(
    session: Session,
    interruptions: Vec<InterruptionInput>,
    db: State<'_, DbState>,
) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    if let Some(id) = session.id {
        conn.execute(
            "UPDATE sessions SET task = ?1, depth = ?2, started_at = ?3, ended_at = ?4, \
             duration = ?5, planned = ?6, interrupts = ?7, rating = ?8, status = ?9 \
             WHERE id = ?10",
            params![
                session.task,
                session.depth,
                session.started_at,
                session.ended_at,
                session.duration,
                session.planned,
                session.interrupts,
                session.rating,
                session.status,
                id,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO sessions (task, depth, started_at, ended_at, duration, planned, interrupts, rating, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                session.task,
                session.depth,
                session.started_at,
                session.ended_at,
                session.duration,
                session.planned,
                session.interrupts,
                session.rating,
                session.status,
            ],
        )
        .map_err(|e| e.to_string())?;
        let id = conn.last_insert_rowid();
        insert_interruptions(&conn, id, &interruptions)?;
        Ok(id)
    }
}

#[tauri::command]
pub fn get_sessions(days: u32, db: State<'_, DbState>) -> Result<Vec<Session>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let cutoff = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64
        - (days as i64 * 86400);

    let mut stmt = conn
        .prepare(
            "SELECT id, task, depth, started_at, ended_at, duration, planned, interrupts, rating, status
             FROM sessions
             WHERE started_at >= ?
             ORDER BY started_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([cutoff], |row| {
            Ok(Session {
                id: Some(row.get(0)?),
                task: row.get(1)?,
                depth: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                duration: row.get(5)?,
                planned: row.get(6)?,
                interrupts: row.get(7)?,
                rating: row.get(8)?,
                status: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_sessions(db: State<'_, DbState>) -> Result<Vec<Session>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, task, depth, started_at, ended_at, duration, planned, interrupts, rating, status
             FROM sessions
             ORDER BY started_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Session {
                id: Some(row.get(0)?),
                task: row.get(1)?,
                depth: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                duration: row.get(5)?,
                planned: row.get(6)?,
                interrupts: row.get(7)?,
                rating: row.get(8)?,
                status: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// Wipe all logged focus data — sessions, their interruptions, and tracked app
/// activity. App/site classification rules are kept (they're user config, not
/// history).
#[tauri::command]
pub fn reset_data(db: State<'_, DbState>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "DELETE FROM interruptions;
         DELETE FROM app_activity;
         DELETE FROM sessions;",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_interruption_breakdown(
    days: u32,
    db: State<'_, DbState>,
) -> Result<Vec<InterruptionBreakdown>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let cutoff = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64
        - (days as i64 * 86400);

    let mut stmt = conn
        .prepare(
            "SELECT i.type, COUNT(*) as cnt
             FROM interruptions i
             INNER JOIN sessions s ON s.id = i.session_id
             WHERE s.started_at >= ?
             GROUP BY i.type
             ORDER BY cnt DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([cutoff], |row| {
            Ok(InterruptionBreakdown {
                interrupt_type: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// Look up an app's bucket by name (case-insensitive). Unknown → "neutral".
/// Used by the watcher thread on every poll.
pub fn lookup_app_bucket(db: &DbState, app_name: &str) -> String {
    let conn = match db.conn.lock() {
        Ok(c) => c,
        Err(_) => return "neutral".to_string(),
    };
    conn.query_row(
        "SELECT bucket FROM app_rules WHERE app_name = ?1 COLLATE NOCASE",
        params![app_name],
        |row| row.get(0),
    )
    .unwrap_or_else(|_| "neutral".to_string())
}

/// Match a browser window title against site_rules (case-insensitive substring).
/// Returns the matched (keyword, bucket), preferring distraction > work > neutral.
/// None when no keyword matches.
pub fn lookup_site_bucket(db: &DbState, title: &str) -> Option<(String, String)> {
    let conn = db.conn.lock().ok()?;
    let mut stmt = conn.prepare("SELECT keyword, bucket FROM site_rules").ok()?;
    let title_lower = title.to_lowercase();
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .ok()?;

    let mut best: Option<(String, String)> = None;
    for (keyword, bucket) in rows.flatten() {
        if !title_lower.contains(&keyword) {
            continue;
        }
        let replace = match best.as_ref().map(|b| b.1.as_str()) {
            None => true,
            Some("distraction") => false,
            _ if bucket == "distraction" => true,
            Some("neutral") if bucket == "work" => true,
            _ => false,
        };
        if replace {
            best = Some((keyword, bucket));
        }
    }
    best
}

#[tauri::command]
pub fn get_app_rules(db: State<'_, DbState>) -> Result<Vec<AppRule>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT app_name, bucket FROM app_rules ORDER BY app_name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AppRule {
                app_name: row.get(0)?,
                bucket: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_app_rule(
    app_name: String,
    bucket: String,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_rules (app_name, bucket) VALUES (?1, ?2)
         ON CONFLICT(app_name) DO UPDATE SET bucket = excluded.bucket",
        params![app_name, bucket],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_site_rules(db: State<'_, DbState>) -> Result<Vec<SiteRule>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT keyword, bucket FROM site_rules ORDER BY keyword")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(SiteRule {
                keyword: row.get(0)?,
                bucket: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_site_rule(
    keyword: String,
    bucket: String,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO site_rules (keyword, bucket) VALUES (?1, ?2)
         ON CONFLICT(keyword) DO UPDATE SET bucket = excluded.bucket",
        params![keyword.to_lowercase(), bucket],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn save_app_activity(
    session_id: i64,
    rows: Vec<AppActivityInput>,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    for row in rows {
        conn.execute(
            "INSERT INTO app_activity (session_id, app_name, bucket, seconds)
             VALUES (?1, ?2, ?3, ?4)",
            params![session_id, row.app_name, row.bucket, row.seconds],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Per-app activity for a single session, busiest first.
#[tauri::command]
pub fn get_session_app_activity(
    session_id: i64,
    db: State<'_, DbState>,
) -> Result<Vec<AppActivityTotal>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT app_name, bucket, SUM(seconds) as total
             FROM app_activity
             WHERE session_id = ?
             GROUP BY app_name, bucket
             ORDER BY total DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_id], |row| {
            Ok(AppActivityTotal {
                app_name: row.get(0)?,
                bucket: row.get(1)?,
                seconds: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_app_activity(
    days: u32,
    db: State<'_, DbState>,
) -> Result<Vec<AppActivityTotal>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let cutoff = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64
        - (days as i64 * 86400);

    let mut stmt = conn
        .prepare(
            "SELECT a.app_name, a.bucket, SUM(a.seconds) as total
             FROM app_activity a
             INNER JOIN sessions s ON s.id = a.session_id
             WHERE s.started_at >= ?
             GROUP BY a.app_name, a.bucket
             ORDER BY total DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([cutoff], |row| {
            Ok(AppActivityTotal {
                app_name: row.get(0)?,
                bucket: row.get(1)?,
                seconds: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}
