/**
 * "Last updated" footer metadata for the home page.
 *
 * Computed at SSG build time inside a server component (no "use client"),
 * so the value is baked into the static HTML once and there is no
 * client/server hydration mismatch to guard against.
 */
export interface LastUpdated {
  /** "YYYY-MM-DD", for the <time dateTime> attribute. */
  iso: string;
  /** tr-TR long format, e.g. "3 Temmuz 2026". */
  display: string;
}

export function getLastUpdated(date: Date = new Date()): LastUpdated {
  const iso = date.toISOString().slice(0, 10);
  // iso and display are derived from the same UTC calendar day (deterministic, TZ-independent).
  const display = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return { iso, display };
}
