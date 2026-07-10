import AppRulesSettings from "../components/AppRulesSettings";
import ContextSwitchSettings from "../components/ContextSwitchSettings";
import NameSettings from "../components/NameSettings";
import NotificationSettings from "../components/NotificationSettings";
import ResetDataSettings from "../components/ResetDataSettings";
import type { SettingsTab } from "../types/navigation";

interface SettingsProps {
  tab: SettingsTab;
}

const COPY: Record<SettingsTab, string> = {
  preferences: "Your name and how Flowky cheers you on.",
  notifications: "Choose which reminders Flowky sends your way.",
  distractions: "Track app focus and pick which apps count as distractions.",
  data: "Manage your focus history stored on this machine.",
};

export default function Settings({ tab }: SettingsProps) {
  return (
    <section className="screen screen-settings" data-screen="settings">
      <header className="settings-header">
        <h2>Settings</h2>
        <p className="screen-subtitle">{COPY[tab]}</p>
      </header>

      {tab === "preferences" && (
        <NameSettings />
      )}

      {tab === "notifications" && <NotificationSettings />}

      {tab === "distractions" && (
        <>
          <ContextSwitchSettings />
          <AppRulesSettings />
        </>
      )}

      {tab === "data" && <ResetDataSettings />}
    </section>
  );
}
