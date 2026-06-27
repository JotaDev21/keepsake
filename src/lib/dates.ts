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
