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
  const classes = [
    "info-hint",
    placement === "below" && "info-hint-below",
    align === "start" && "info-hint-start",
    align === "end" && "info-hint-end",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} tabIndex={0} role="note" aria-label={text}>
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <circle cx="12" cy="8" r="1.3" fill="var(--surface)" />
        <rect x="11" y="11" width="2" height="6" rx="1" fill="var(--surface)" />
      </svg>
      <span className="info-hint-bubble">{text}</span>
    </span>
  );
}
