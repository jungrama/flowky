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
  { screen: "tasks", label: "Tasks" },
  { screen: "dailyReview", label: "Today" },
  { screen: "calendarHeatmap", label: "Calendar" },
];

const NAV_TAB_CLASS =
  "relative -mb-px cursor-pointer border-b-2 border-transparent px-0 pt-2 pb-[9px] text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:border-primary data-[active=true]:text-foreground";

export default function AppNav({
  screen,
  onNavigate,
  settingsTab,
  onSettingsTab,
}: AppNavProps) {
  const inSettings = screen === "settings";
  return (
    <header className="sticky top-0 z-[5] border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 p-0 text-xl font-medium tracking-[-0.03em] text-foreground"
          onClick={() => onNavigate("home")}
        >
          <img
            className="flex-none"
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
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[1.1rem] leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground"
          aria-label="Settings"
          data-active={inSettings}
          onClick={() => onNavigate("settings")}
        >
          ⚙
        </button>
      </div>
      {inSettings ? (
        <nav className="flex gap-6 px-4" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={NAV_TAB_CLASS}
              data-active={settingsTab === tab.id}
              onClick={() => onSettingsTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      ) : (
        <nav className="flex gap-6 px-4" aria-label="Main">
          {TABS.map((tab) => (
            <button
              key={tab.screen}
              type="button"
              className={NAV_TAB_CLASS}
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
