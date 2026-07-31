function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

const DAY_MS = 86400000;

/** Build a date in `year`, clamping Feb 29 → Feb 28 in non-leap years. */
function occurrenceInYear(year: number, month: number, day: number): Date {
  const c = new Date(year, month, day);
  // If the day overflowed into the next month (e.g. Feb 29 in a non-leap year),
  // clamp to the last day of the intended month.
  if (c.getMonth() !== month) return new Date(year, month + 1, 0);
  return c;
}

/** The next time a date occurs. Recurring dates roll to this/next year. */
export function nextOccurrence(dateMs: number, recorrente: boolean): Date {
  const d = new Date(dateMs);
  if (!recorrente) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfToday();
  const thisYear = occurrenceInYear(today.getFullYear(), d.getMonth(), d.getDate());
  return thisYear.getTime() < today.getTime()
    ? occurrenceInYear(today.getFullYear() + 1, d.getMonth(), d.getDate())
    : thisYear;
}

/** Whole days from today until the (next) occurrence. Negative = in the past. */
export function daysUntil(dateMs: number, recorrente: boolean): number {
  return Math.round((nextOccurrence(dateMs, recorrente).getTime() - startOfToday().getTime()) / DAY_MS);
}

/** A gentle countdown label: "hoje", "amanhã", "em N dias", "há N dias". */
export function countdownLabel(dateMs: number, recorrente: boolean): string {
  const days = daysUntil(dateMs, recorrente);
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days > 1) return `em ${days} dias`;
  if (days === -1) return 'ontem';
  return `há ${-days} dias`;
}

/** How old a day (start-of-day ms) is: "hoje", "ontem", "há N dias". */
export function dayAgeLabel(diaMs: number): string {
  const d = new Date(diaMs);
  const today = startOfToday();
  const days = Math.round((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / DAY_MS);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

/** How long ago a moment was, softly: "agora há pouco", "há 20 min", "há 3 h", "ontem". */
export function momentAgeLabel(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 15 * 60000) return 'agora há pouco';
  if (diff < 60 * 60000) return `há ${Math.round(diff / 60000)} min`;
  if (new Date(ms).getTime() >= startOfToday().getTime()) return `há ${Math.round(diff / 3600000)} h`;
  return 'ontem';
}

/** Deliberately coarse presence: enough to feel proximity, never a precise activity log. */
export function presenceLabel(ms: number | null, now = Date.now()): string {
  if (!ms) return 'presença ainda não disponível';
  const diff = Math.max(0, now - ms);
  if (diff < 2 * 60000) return 'por aqui agora';

  const seen = new Date(ms);
  const current = new Date(now);
  const seenDay = new Date(seen.getFullYear(), seen.getMonth(), seen.getDate()).getTime();
  const currentDay = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  const days = Math.round((currentDay - seenDay) / DAY_MS);
  if (days <= 0) return 'passou por aqui hoje';
  if (days === 1) return 'passou por aqui ontem';
  if (days <= 7) return `passou por aqui há ${days} dias`;
  return 'esteve por aqui recentemente';
}
