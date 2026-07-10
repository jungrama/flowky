import brandIcon from "../assets/icon.png";
import {
  SETTINGS_TABS,
  type Screen,
  type SettingsTab,
} from "../types/navigation";

interface AppNavProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  settingsTab: SettingsTab;
  onSettingsTab: (tab: SettingsTab) => void;
}

const TABS: { screen: Screen; label: string }[] = [
  { screen: "home", label: "Home" },
  { screen: "dailyReview", label: "Today" },
  { screen: "calendarHeatmap", label: "Calendar" },
];

export default function AppNav({
  screen,
  onNavigate,
  settingsTab,
  onSettingsTab,
}: AppNavProps) {
  const inSettings = screen === "settings";
  return (
    <header className="app-nav">
      <div className="app-nav-bar">
        <button
          type="button"
          className="app-nav-brand"
          onClick={() => onNavigate("home")}
        >
          <img
            className="app-nav-logo"
            src={brandIcon}
            width="22"
            height="22"
            alt=""
            aria-hidden="true"
          />
          Flowky
        </button>
        <button
          type="button"
          className="app-nav-gear"
          aria-label="Settings"
          data-active={inSettings}
          onClick={() => onNavigate("settings")}
        >
          ⚙
        </button>
      </div>
      {inSettings ? (
        <nav className="app-nav-tabs" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="app-nav-tab"
              data-active={settingsTab === tab.id}
              onClick={() => onSettingsTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      ) : (
        <nav className="app-nav-tabs" aria-label="Main">
          {TABS.map((tab) => (
            <button
              key={tab.screen}
              type="button"
              className="app-nav-tab"
              data-active={screen === tab.screen}
              onClick={() => onNavigate(tab.screen)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
