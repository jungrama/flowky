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
    <section
      className="flex w-full max-w-sm flex-col items-center gap-4"
      data-screen="settings"
    >
      <header className="flex w-full flex-col gap-1 text-left">
        <h2 className="text-2xl font-normal tracking-[-0.03em]">Settings</h2>
        <p className="text-sm text-muted-foreground">{COPY[tab]}</p>
      </header>

      {tab === "preferences" && <NameSettings />}

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
