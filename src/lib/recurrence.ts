import { shiftMonths } from "@/lib/billing-cycle";

export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function nextOccurrence(frequency: RecurrenceFrequency, date: Date): Date {
  switch (frequency) {
    case "WEEKLY":
      return addDays(date, 7);
    case "MONTHLY":
      return shiftMonths(date, 1);
    case "YEARLY":
      return shiftMonths(date, 12);
  }
}

/**
 * Given a rule's schedule and how far it has already been generated,
 * returns every occurrence date still due as of `today` (inclusive),
 * respecting the rule's own end date. Pure — no I/O — so the "when does a
 * recurring transaction actually get created" rule can be tested without a
 * database standing in for "today".
 */
export function occurrencesToGenerate({
  frequency,
  startDate,
  lastGeneratedDate,
  endDate,
  today,
}: {
  frequency: RecurrenceFrequency;
  startDate: Date;
  lastGeneratedDate: Date | null;
  endDate: Date | null;
  today: Date;
}): Date[] {
  const occurrences: Date[] = [];
  let next = lastGeneratedDate ? nextOccurrence(frequency, lastGeneratedDate) : startDate;

  while (next.getTime() <= today.getTime() && (!endDate || next.getTime() <= endDate.getTime())) {
    occurrences.push(next);
    next = nextOccurrence(frequency, next);
  }

  return occurrences;
}
