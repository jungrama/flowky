import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoHintProps {
  text: string;
  placement?: "above" | "below";
  /** Horizontal anchor of the bubble — use "start"/"end" on edge cards so the
   *  tooltip stays inside the window instead of forcing a scrollbar. */
  align?: "center" | "start" | "end";
}

/** Small "i" affordance that reveals a plain-language explanation on hover or
 *  focus. Used on score / stat cards. */
export default function InfoHint({
  text,
  placement = "above",
  align = "center",
}: InfoHintProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex cursor-help items-center text-muted-foreground opacity-70 outline-none hover:text-primary hover:opacity-100 focus-visible:text-primary focus-visible:opacity-100"
          aria-label={text}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <circle cx="12" cy="8" r="1.3" fill="var(--card)" />
            <rect x="11" y="11" width="2" height="6" rx="1" fill="var(--card)" />
          </svg>
        </TooltipTrigger>
        <TooltipContent
          side={placement === "below" ? "bottom" : "top"}
          align={align}
          sideOffset={8}
          className="max-w-[200px] px-4 py-2 text-left leading-[1.45] font-normal tracking-normal text-wrap shadow-[0_6px_18px_rgb(38_37_30/0.22)]"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
