const CATEGORIES_KEY = "flowky.interruptCategories";

export interface InterruptCategory {
  key: string;
  label: string;
  icon: string;
  enabled: boolean;
}

export const DEFAULT_INTERRUPT_CATEGORIES: InterruptCategory[] = [
  { key: "slack", label: "Slack / chat", icon: "💬", enabled: true },
  { key: "in_person", label: "Someone stopped by", icon: "👋", enabled: true },
  { key: "other_app", label: "Checked another app", icon: "📱", enabled: true },
  { key: "other", label: "Other", icon: "···", enabled: true },
];

const DEFAULT_KEYS = new Set(DEFAULT_INTERRUPT_CATEGORIES.map((c) => c.key));

function mergeWithDefaults(stored: InterruptCategory[]): InterruptCategory[] {
  const byKey = new Map(stored.map((c) => [c.key, c]));
  const merged: InterruptCategory[] = [];

  for (const fallback of DEFAULT_INTERRUPT_CATEGORIES) {
    merged.push(byKey.get(fallback.key) ?? fallback);
    byKey.delete(fallback.key);
  }

  for (const custom of stored) {
    if (!DEFAULT_KEYS.has(custom.key) && !merged.some((c) => c.key === custom.key)) {
      merged.push(custom);
    }
  }

  return merged;
}

export function getInterruptCategories(): InterruptCategory[] {
  const raw = localStorage.getItem(CATEGORIES_KEY);
  if (!raw) return [...DEFAULT_INTERRUPT_CATEGORIES];

  try {
    const parsed = JSON.parse(raw) as InterruptCategory[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_INTERRUPT_CATEGORIES];
    }
    return mergeWithDefaults(parsed);
  } catch {
    return [...DEFAULT_INTERRUPT_CATEGORIES];
  }
}

export function saveInterruptCategories(categories: InterruptCategory[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function getEnabledInterruptCategories(): InterruptCategory[] {
  return getInterruptCategories().filter((c) => c.enabled);
}

export function getInterruptCategoryLabel(key: string): string {
  const match = getInterruptCategories().find((c) => c.key === key);
  return match?.label ?? key.replace(/_/g, " ");
}

export function slugifyCategoryKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  if (!base) return `custom_${Date.now()}`;

  const existing = new Set(getInterruptCategories().map((c) => c.key));
  if (!existing.has(base)) return base;

  let i = 2;
  while (existing.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

export function isDefaultCategoryKey(key: string): boolean {
  return DEFAULT_KEYS.has(key);
}
