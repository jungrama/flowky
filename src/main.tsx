import { getCurrentWindow } from "@tauri-apps/api/window";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App";
import { initTheme } from "./lib/theme";
import Nudge from "./screens/Nudge";
import Popover from "./screens/Popover";
import "./styles/app.css";

initTheme();

// getCurrentWindow() reads Tauri internals that are absent in a plain browser
// tab (or before injection), so guard it — default to the main app.
function currentWindowLabel(): string {
  try {
    return getCurrentWindow().label;
  } catch {
    return "main";
  }
}

const label = currentWindowLabel();

if (label === "popover") {
  document.body.classList.add("popover-body");
} else if (label === "nudge") {
  document.body.classList.add("nudge-body");
}

function Root() {
  if (label === "popover") return <Popover />;
  if (label === "nudge") return <Nudge />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider delayDuration={200}>
      <Root />
    </TooltipProvider>
  </StrictMode>,
);
