use crate::db::Session;
use chrono::{Local, TimeZone, Timelike};
use serde::Serialize;

const MIN_MINUTES: u32 = 15;
const MAX_MINUTES: u32 = 90;
const DEFAULT_MINUTES: u32 = 25;
const DEPTH_MIN_SESSIONS: usize = 3;
const WEIGHT_DECAY: f32 = 0.85;
const MIN_TOD_SESSIONS: usize = 5;
const MIN_PERIOD_SESSIONS: usize = 2;
const MIN_PERIOD_SPREAD: f32 = 8.0;
const TOD_MODIFIER_MAX: f32 = 10.0;

#[derive(Debug, Clone, Serialize)]
pub struct LengthSuggestion {
    pub minutes: u32,
    pub explanation: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TimePeriod {
    Morning,
    Afternoon,
    Evening,
    Night,
}

const TIME_PERIODS: [TimePeriod; 4] = [
    TimePeriod::Morning,
    TimePeriod::Afternoon,
    TimePeriod::Evening,
    TimePeriod::Night,
];

#[derive(Debug, Clone)]
struct TimeOfDayProfile {
    period_averages: [Option<f32>; 4],
    peak: Option<TimePeriod>,
    overall_average: f32,
    ready: bool,
}

impl TimeOfDayProfile {
    fn empty() -> Self {
        Self {
            period_averages: [None; 4],
            peak: None,
            overall_average: 0.0,
            ready: false,
        }
    }
}

fn period_index(period: TimePeriod) -> usize {
    match period {
        TimePeriod::Morning => 0,
        TimePeriod::Afternoon => 1,
        TimePeriod::Evening => 2,
        TimePeriod::Night => 3,
    }
}

fn local_hour(timestamp: i64) -> u32 {
    Local
        .timestamp_opt(timestamp, 0)
        .single()
        .map(|dt| dt.hour())
        .unwrap_or(12)
}

fn time_period_for_hour(hour: u32) -> TimePeriod {
    match hour {
        5..=11 => TimePeriod::Morning,
        12..=16 => TimePeriod::Afternoon,
        17..=21 => TimePeriod::Evening,
        _ => TimePeriod::Night,
    }
}

fn session_time_period(session: &Session) -> TimePeriod {
    time_period_for_hour(local_hour(session.started_at))
}

fn period_label(period: TimePeriod) -> &'static str {
    match period {
        TimePeriod::Morning => "mornings",
        TimePeriod::Afternoon => "afternoons",
        TimePeriod::Evening => "evenings",
        TimePeriod::Night => "late night",
    }
}

fn peak_window_phrase(period: TimePeriod, depth: &str) -> String {
    let window = period_label(period);
    match depth {
        "light" => format!("{window} have been your strongest light-task window"),
        "creative" => format!("{window} have been your strongest creative window"),
        _ => format!("{window} have been your strongest deep-work window"),
    }
}

fn session_quality_base(session: &Session) -> f32 {
    let planned = session.planned.max(1) as f32;
    let duration = session.duration.unwrap_or(0).max(0) as f32;
    let completion = (duration / planned).min(1.0);
    let interrupt_penalty = (session.interrupts as f32 * 0.08).min(0.4);
    let rating_bonus = session
        .rating
        .map(|rating| (rating as f32 - 3.0) * 0.05)
        .unwrap_or(0.0);

    ((completion - interrupt_penalty + rating_bonus) * 100.0).clamp(0.0, 100.0)
}

fn build_time_of_day_profile(sessions: &[Session]) -> TimeOfDayProfile {
    let completed: Vec<&Session> = sessions
        .iter()
        .filter(|session| session.status != "abandoned")
        .collect();

    if completed.len() < MIN_TOD_SESSIONS {
        return TimeOfDayProfile::empty();
    }

    let mut period_scores: [Vec<f32>; 4] = std::array::from_fn(|_| Vec::new());
    for session in &completed {
        let period = session_time_period(session);
        period_scores[period_index(period)].push(session_quality_base(session));
    }

    let mut period_averages = [None; 4];
    let mut populated_periods = 0usize;
    let mut overall_total = 0.0;
    let mut overall_count = 0usize;

    for (idx, scores) in period_scores.iter().enumerate() {
        if scores.len() < MIN_PERIOD_SESSIONS {
            continue;
        }
        let average = scores.iter().sum::<f32>() / scores.len() as f32;
        period_averages[idx] = Some(average);
        overall_total += scores.iter().sum::<f32>();
        overall_count += scores.len();
        populated_periods += 1;
    }

    if populated_periods < 2 || overall_count == 0 {
        return TimeOfDayProfile::empty();
    }

    let overall_average = overall_total / overall_count as f32;
    let mut peak = None;
    let mut peak_average = f32::MIN;
    let mut trough_average = f32::MAX;

    for period in TIME_PERIODS {
        let idx = period_index(period);
        if let Some(average) = period_averages[idx] {
            if average > peak_average {
                peak_average = average;
                peak = Some(period);
            }
            trough_average = trough_average.min(average);
        }
    }

    if peak_average - trough_average < MIN_PERIOD_SPREAD {
        return TimeOfDayProfile::empty();
    }

    TimeOfDayProfile {
        period_averages,
        peak,
        overall_average,
        ready: true,
    }
}

fn time_of_day_modifier(session: &Session, profile: &TimeOfDayProfile) -> f32 {
    if !profile.ready {
        return 0.0;
    }

    let period = session_time_period(session);
    let period_average = match profile.period_averages[period_index(period)] {
        Some(average) => average,
        None => return 0.0,
    };

    let Some(peak) = profile.peak else {
        return 0.0;
    };

    let peak_avg = profile.period_averages[period_index(peak)].unwrap_or(profile.overall_average);
    let trough_avg = profile
        .period_averages
        .iter()
        .filter_map(|avg| *avg)
        .min_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
        .unwrap_or(profile.overall_average);

    let spread = (peak_avg - trough_avg).max(MIN_PERIOD_SPREAD);
    let relative = (period_average - profile.overall_average) / spread;
    (relative * TOD_MODIFIER_MAX).clamp(-TOD_MODIFIER_MAX, TOD_MODIFIER_MAX)
}

fn session_quality(session: &Session, profile: &TimeOfDayProfile) -> f32 {
    let base = session_quality_base(session);
    let modifier = time_of_day_modifier(session, profile);
    (base + modifier).clamp(0.0, 100.0)
}

fn append_time_of_day_note(explanation: String, profile: &TimeOfDayProfile, depth: &str) -> String {
    let Some(peak) = profile.peak else {
        return explanation;
    };

    let current_period = time_period_for_hour(local_hour(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0),
    ));

    if current_period == peak {
        return format!(
            "{} — {}.",
            explanation,
            peak_window_phrase(peak, depth)
        );
    }

    explanation
}

#[tauri::command]
pub fn compute_score(sessions: Vec<Session>) -> f32 {
    if sessions.is_empty() {
        return 0.0;
    }

    let profile = build_time_of_day_profile(&sessions);
    let mut ordered = sessions;
    ordered.sort_by(|a, b| b.started_at.cmp(&a.started_at));

    let weights: Vec<f32> = (0..ordered.len())
        .map(|i| WEIGHT_DECAY.powi(i as i32))
        .collect();
    let total_weight: f32 = weights.iter().sum();

    ordered
        .iter()
        .zip(weights.iter())
        .map(|(session, weight)| weight * session_quality(session, &profile))
        .sum::<f32>()
        / total_weight
}

fn depth_label(depth: &str) -> &str {
    match depth {
        "light" => "light tasks",
        "creative" => "creative work",
        _ => "deep work",
    }
}

fn round_to_nearest_five(minutes: f32) -> u32 {
    let rounded = (minutes / 5.0).round() * 5.0;
    rounded.clamp(MIN_MINUTES as f32, MAX_MINUTES as f32) as u32
}

fn flow_minutes(session: &Session) -> Option<f32> {
    let duration = session.duration?;
    if duration <= 0 {
        return None;
    }

    let planned = session.planned.max(1) as f32;
    let duration_f = duration as f32;
    let completion = duration_f / planned;

    if session.status == "extended" || (completion >= 0.85 && session.interrupts == 0) {
        Some(duration_f / 60.0)
    } else if completion >= 0.7 {
        Some((duration_f / 60.0) * 0.9)
    } else {
        None
    }
}

fn analysis_pool<'a>(sessions: &'a [Session], depth: &str) -> Vec<&'a Session> {
    let completed: Vec<&Session> = sessions
        .iter()
        .filter(|session| session.status != "abandoned")
        .collect();

    let depth_sessions: Vec<&Session> = completed
        .iter()
        .copied()
        .filter(|session| session.depth == depth)
        .collect();

    if depth_sessions.len() >= DEPTH_MIN_SESSIONS {
        depth_sessions
    } else {
        completed
    }
}

fn weighted_recent_average(values: &[f32]) -> f32 {
    if values.is_empty() {
        return DEFAULT_MINUTES as f32;
    }

    let weights: Vec<f32> = (0..values.len())
        .map(|i| WEIGHT_DECAY.powi(i as i32))
        .collect();
    let total_weight: f32 = weights.iter().sum();

    values
        .iter()
        .zip(weights.iter())
        .map(|(value, weight)| value * weight)
        .sum::<f32>()
        / total_weight
}

fn median_minutes(values: &mut [f32]) -> f32 {
    if values.is_empty() {
        return DEFAULT_MINUTES as f32;
    }

    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mid = values.len() / 2;
    if values.len() % 2 == 0 {
        (values[mid - 1] + values[mid]) / 2.0
    } else {
        values[mid]
    }
}

fn build_explanation(depth: &str, flow_minutes: f32, depth_specific: bool) -> String {
    let flow_rounded = flow_minutes.round() as u32;
    let label = depth_label(depth);

    if depth_specific {
        format!(
            "Based on your last 7 days — you hit flow around {flow_rounded} min on {label}."
        )
    } else {
        format!(
            "Based on your last 7 days — you typically find flow around {flow_rounded} min."
        )
    }
}

fn suggest_length_internal(sessions: &[Session], depth: &str) -> LengthSuggestion {
    let tod_profile = build_time_of_day_profile(sessions);
    let mut ordered: Vec<&Session> = analysis_pool(sessions, depth);
    ordered.sort_by(|a, b| b.started_at.cmp(&a.started_at));

    if ordered.is_empty() {
        return LengthSuggestion {
            minutes: DEFAULT_MINUTES,
            explanation: "Start with 25 min — we'll learn your rhythm over time.".to_string(),
        };
    }

    let depth_specific = ordered.iter().all(|session| session.depth == depth)
        && ordered.len() >= DEPTH_MIN_SESSIONS;

    let flow_times: Vec<f32> = ordered
        .iter()
        .filter_map(|session| flow_minutes(session))
        .collect();

    let raw_minutes = if !flow_times.is_empty() {
        weighted_recent_average(&flow_times)
    } else {
        let mut planned_minutes: Vec<f32> = ordered
            .iter()
            .map(|session| session.planned as f32 / 60.0)
            .collect();
        median_minutes(&mut planned_minutes)
    };

    let minutes = round_to_nearest_five(raw_minutes);
    let explanation = if flow_times.is_empty() {
        format!(
            "Based on your last 7 days — {minutes} min fits your recent {label} sessions.",
            label = depth_label(depth)
        )
    } else {
        build_explanation(depth, raw_minutes, depth_specific)
    };

    LengthSuggestion {
        minutes,
        explanation: append_time_of_day_note(explanation, &tod_profile, depth),
    }
}

#[tauri::command]
pub fn suggest_length(sessions: Vec<Session>, depth: String) -> LengthSuggestion {
    suggest_length_internal(&sessions, &depth)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_session(
        started_at: i64,
        planned: i64,
        duration: i64,
        interrupts: i64,
        rating: Option<i64>,
        status: &str,
        depth: &str,
    ) -> Session {
        Session {
            id: None,
            task: "Test".to_string(),
            depth: depth.to_string(),
            started_at,
            ended_at: Some(started_at + duration),
            duration: Some(duration),
            planned,
            interrupts,
            rating,
            status: status.to_string(),
        }
    }

    fn morning_ts(day_offset: i64) -> i64 {
        let base = Local::now().date_naive().and_hms_opt(9, 0, 0).unwrap();
        Local
            .from_local_datetime(&base)
            .single()
            .unwrap()
            .timestamp()
            - day_offset * 86_400
    }

    fn afternoon_ts(day_offset: i64) -> i64 {
        let base = Local::now().date_naive().and_hms_opt(14, 0, 0).unwrap();
        Local
            .from_local_datetime(&base)
            .single()
            .unwrap()
            .timestamp()
            - day_offset * 86_400
    }

    #[test]
    fn compute_score_returns_zero_for_empty_sessions() {
        assert_eq!(compute_score(vec![]), 0.0);
    }

    #[test]
    fn compute_score_weights_recent_sessions_more() {
        let good_old = sample_session(100, 1500, 1500, 0, Some(5), "completed", "deep");
        let bad_new = sample_session(200, 1500, 300, 5, Some(1), "completed", "deep");
        let recent_bad = compute_score(vec![good_old, bad_new]);

        let bad_old = sample_session(100, 1500, 300, 5, Some(1), "completed", "deep");
        let good_new = sample_session(200, 1500, 1500, 0, Some(5), "completed", "deep");
        let recent_good = compute_score(vec![bad_old, good_new]);

        assert!(
            recent_good > recent_bad,
            "a recent strong session should outweigh an older weak one"
        );
    }

    #[test]
    fn session_quality_applies_interrupt_penalty_and_rating_bonus() {
        let profile = TimeOfDayProfile::empty();
        let clean = sample_session(1, 1500, 1500, 0, Some(5), "completed", "deep");
        let interrupted = sample_session(1, 1500, 1500, 5, Some(1), "completed", "deep");

        assert!(session_quality(&clean, &profile) > session_quality(&interrupted, &profile));
    }

    #[test]
    fn time_of_day_profile_requires_minimum_data() {
        let sessions = vec![
            sample_session(morning_ts(0), 1500, 1500, 0, Some(5), "completed", "deep"),
            sample_session(morning_ts(1), 1500, 1500, 0, Some(5), "completed", "deep"),
        ];
        let profile = build_time_of_day_profile(&sessions);
        assert!(!profile.ready);
    }

    #[test]
    fn time_of_day_boosts_peak_hour_sessions() {
        let mut sessions = Vec::new();
        for day in 0..4 {
            sessions.push(sample_session(
                morning_ts(day),
                1500,
                1500,
                0,
                Some(5),
                "completed",
                "deep",
            ));
            sessions.push(sample_session(
                afternoon_ts(day),
                1500,
                300,
                4,
                Some(1),
                "completed",
                "deep",
            ));
        }

        let profile = build_time_of_day_profile(&sessions);
        assert!(profile.ready);
        assert_eq!(profile.peak, Some(TimePeriod::Morning));

        let morning = sample_session(morning_ts(0), 1500, 1500, 0, Some(4), "completed", "deep");
        let afternoon =
            sample_session(afternoon_ts(0), 1500, 1500, 0, Some(4), "completed", "deep");

        assert!(
            session_quality(&morning, &profile) > session_quality(&afternoon, &profile),
            "sessions during the stronger window should score higher"
        );
    }

    #[test]
    fn suggest_length_defaults_without_history() {
        let suggestion = suggest_length_internal(&[], "deep");
        assert_eq!(suggestion.minutes, DEFAULT_MINUTES);
        assert!(suggestion.explanation.contains("learn your rhythm"));
    }

    #[test]
    fn suggest_length_clamps_to_valid_range() {
        let sessions = vec![sample_session(
            1,
            7200,
            7200,
            0,
            Some(5),
            "extended",
            "deep",
        )];
        let suggestion = suggest_length_internal(&sessions, "deep");
        assert_eq!(suggestion.minutes, MAX_MINUTES);
    }

    #[test]
    fn suggest_length_uses_depth_when_enough_data() {
        let sessions = vec![
            sample_session(1, 720, 720, 0, Some(4), "completed", "deep"),
            sample_session(2, 720, 720, 0, Some(4), "completed", "deep"),
            sample_session(3, 720, 720, 0, Some(4), "completed", "deep"),
            sample_session(4, 1500, 1500, 0, Some(4), "completed", "light"),
        ];

        let suggestion = suggest_length_internal(&sessions, "deep");
        assert_eq!(suggestion.minutes, 15);
        assert!(suggestion.explanation.contains("deep work"));
    }
}
