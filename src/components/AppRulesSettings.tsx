import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
    setSites((prev) =>
      prev.map((r) => (r.key === keyword ? { ...r, bucket } : r)),
    );
    void setSiteRule(keyword, bucket);
  };

  const addApp = () => {
    const name = newApp.trim();
    if (!name || apps.some((r) => r.key.toLowerCase() === name.toLowerCase()))
      return;
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
      return <p className="py-2 text-sm text-muted-foreground">No matches.</p>;
    }
    return (
      <ul className="flex flex-col gap-1">
        {filtered.map((row) => {
          const on = row.bucket === "distraction";
          return (
            <li
              key={row.key}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-card-foreground shadow-sm"
            >
              <span className="flex-1 truncate text-sm text-foreground">
                {row.key}
              </span>
              <span className="text-xs text-muted-foreground">
                {on ? "Distraction" : "Neutral"}
              </span>
              <Switch
                aria-label={`Mark ${row.key} as a distraction`}
                checked={on}
                onCheckedChange={(next) =>
                  onChange(row.key, next ? "distraction" : "neutral")
                }
              />
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
    <Card className="w-full gap-2 p-4 shadow-none">
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start px-0 text-sm font-medium hover:bg-transparent"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
      >
        Sort your apps and sites
      </Button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Flip the switch on anything that tends to pull you off track. Flowky
            gives you a gentle nudge when a distraction keeps you away during a
            session. Browser titles are matched in-memory by keyword and never
            stored.
          </p>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Apps</p>
            <Badge variant="secondary">{appCount} distractions</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Name a distracting app (e.g. Spotify)"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addApp()}
              aria-label="New app name"
            />
            <Button type="button" variant="secondary" onClick={addApp}>
              Add
            </Button>
          </div>
          {apps.length > 6 && (
            <Input
              type="search"
              placeholder="Filter apps…"
              value={appQuery}
              onChange={(e) => setAppQuery(e.target.value)}
              aria-label="Filter apps"
            />
          )}
          {renderRows(apps, appQuery, changeApp)}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Browser sites
            </p>
            <Badge variant="secondary">{siteCount} distractions</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Matched by keyword in the page title.
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Name a distracting keyword (e.g. hacker news)"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSite()}
              aria-label="New site keyword"
            />
            <Button type="button" variant="secondary" onClick={addSite}>
              Add
            </Button>
          </div>
          {sites.length > 6 && (
            <Input
              type="search"
              placeholder="Filter sites…"
              value={siteQuery}
              onChange={(e) => setSiteQuery(e.target.value)}
              aria-label="Filter sites"
            />
          )}
          {renderRows(sites, siteQuery, changeSite)}
        </div>
      )}
    </Card>
  );
}
