/**
 * US equity regular session (NYSE / Nasdaq): Mon–Fri, 9:30–16:00 America/New_York.
 * Does not model exchange holidays (desk-style widget).
 */

const ET = "America/New_York";
const OPEN_MIN = 9 * 60 + 30;
const CLOSE_MIN = 16 * 60;

function minutesSinceMidnightET(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  const m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  return h * 60 + m;
}

export function isWeekdayET(d: Date): boolean {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short" }).format(d);
  return w !== "Sat" && w !== "Sun";
}

export function isEquitySessionOpen(d: Date): boolean {
  if (!isWeekdayET(d)) return false;
  const mins = minutesSinceMidnightET(d);
  return mins >= OPEN_MIN && mins < CLOSE_MIN;
}

/** Next session open or close instant (1s resolution). */
export function getCountdownTarget(d: Date): { at: Date; label: string } {
  const step = 1000;

  if (isEquitySessionOpen(d)) {
    let t = d.getTime();
    const limit = t + 24 * 60 * 60 * 1000;
    while (t < limit) {
      t += step;
      if (!isEquitySessionOpen(new Date(t))) {
        return { at: new Date(t), label: "Regular session closes" };
      }
    }
  }

  let t = d.getTime();
  const limit = t + 7 * 24 * 60 * 60 * 1000;
  while (t < limit) {
    t += step;
    if (isEquitySessionOpen(new Date(t))) {
      return { at: new Date(t), label: "Regular session opens" };
    }
  }

  return { at: new Date(d.getTime() + 60_000), label: "Regular session opens" };
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function formatETTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatETDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
