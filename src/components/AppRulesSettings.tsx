import { useEffect, useMemo, useState } from "react";
import {
  getAppRules,
  getSiteRules,
  setAppRule,
  setSiteRule,
  type AppBucket,
  type AppRule,
  type SiteRule,
} from "../lib/tauri";

interface RuleRow {
  key: string;
  bucket: AppBucket;
}

export default function AppRulesSettings() {
  const [expanded, setExpanded] = useState(false);
  const [apps, setApps] = useState<RuleRow[]>([]);
  const [sites, setSites] = useState<RuleRow[]>([]);
  const [newApp, setNewApp] = useState("");
  const [newSite, setNewSite] = useState("");
  const [appQuery, setAppQuery] = useState("");
  const [siteQuery, setSiteQuery] = useState("");

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    void Promise.all([getAppRules(), getSiteRules()]).then(([a, s]) => {
      if (cancelled) return;
      setApps(a.map((r: AppRule) => ({ key: r.app_name, bucket: r.bucket })));
      setSites(s.map((r: SiteRule) => ({ key: r.keyword, bucket: r.bucket })));
    });
    return () => {
      cancelled = true;
    };
  }, [expanded]);

  const changeApp = (name: string, bucket: AppBucket) => {
    setApps((prev) => prev.map((r) => (r.key === name ? { ...r, bucket } : r)));
    void setAppRule(name, bucket);
  };

  const changeSite = (keyword: string, bucket: AppBucket) => {
    setSites((prev) => prev.map((r) => (r.key === keyword ? { ...r, bucket } : r)));
    void setSiteRule(keyword, bucket);
  };

  const addApp = () => {
    const name = newApp.trim();
    if (!name || apps.some((r) => r.key.toLowerCase() === name.toLowerCase())) return;
    setApps((prev) => [{ key: name, bucket: "distraction" }, ...prev]);
    void setAppRule(name, "distraction");
    setNewApp("");
  };

  const addSite = () => {
    const keyword = newSite.trim().toLowerCase();
    if (!keyword || sites.some((r) => r.key === keyword)) return;
    setSites((prev) => [{ key: keyword, bucket: "distraction" }, ...prev]);
    void setSiteRule(keyword, "distraction");
    setNewSite("");
  };

  const renderRows = (
    rows: RuleRow[],
    query: string,
    onChange: (key: string, bucket: AppBucket) => void,
  ) => {
    const filtered = rows.filter((r) =>
      r.key.toLowerCase().includes(query.trim().toLowerCase()),
    );
    if (filtered.length === 0) {
      return <p className="rule-empty">No matches.</p>;
    }
    return (
      <ul className="rule-list">
        {filtered.map((row) => {
          const on = row.bucket === "distraction";
          return (
            <li key={row.key} className={`rule-row${on ? " is-on" : ""}`}>
              <span className="rule-name">{row.key}</span>
              <span className="rule-state">{on ? "Distraction" : "Neutral"}</span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Mark ${row.key} as a distraction`}
                className="rule-switch"
                onClick={() => onChange(row.key, on ? "neutral" : "distraction")}
              >
                <span className="rule-switch-thumb" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const appCount = useMemo(
    () => apps.filter((r) => r.bucket === "distraction").length,
    [apps],
  );
  const siteCount = useMemo(
    () => sites.filter((r) => r.bucket === "distraction").length,
    [sites],
  );

  return (
    <div className="interrupt-settings">
      <button
        type="button"
        className="interrupt-settings-toggle"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
      >
Sort your apps and sites
      </button>

      {expanded && (
        <div className="interrupt-settings-panel">
          <p className="screen-subtitle interrupt-settings-copy">
            Flip the switch on anything that tends to pull you off track. Flowky gives you
            a gentle nudge when a distraction keeps you away during a session. Browser
            titles are matched in-memory by keyword and never stored.
          </p>

          <div className="rule-section-head">
            <p className="form-label">Apps</p>
            <span className="rule-count">{appCount} distractions</span>
          </div>
          <div className="rule-add">
            <input
              type="text"
              className="rule-input"
              placeholder="Name a distracting app (e.g. Spotify)"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addApp()}
              aria-label="New app name"
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addApp}>
              Add
            </button>
          </div>
          {apps.length > 6 && (
            <input
              type="search"
              className="rule-input rule-filter"
              placeholder="Filter apps…"
              value={appQuery}
              onChange={(e) => setAppQuery(e.target.value)}
              aria-label="Filter apps"
            />
          )}
          {renderRows(apps, appQuery, changeApp)}

          <div className="rule-section-head rule-section-head-spaced">
            <p className="form-label">Browser sites</p>
            <span className="rule-count">{siteCount} distractions</span>
          </div>
          <p className="rule-hint">Matched by keyword in the page title.</p>
          <div className="rule-add">
            <input
              type="text"
              className="rule-input"
              placeholder="Name a distracting keyword (e.g. hacker news)"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSite()}
              aria-label="New site keyword"
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addSite}>
              Add
            </button>
          </div>
          {sites.length > 6 && (
            <input
              type="search"
              className="rule-input rule-filter"
              placeholder="Filter sites…"
              value={siteQuery}
              onChange={(e) => setSiteQuery(e.target.value)}
              aria-label="Filter sites"
            />
          )}
          {renderRows(sites, siteQuery, changeSite)}
        </div>
      )}
    </div>
  );
}
