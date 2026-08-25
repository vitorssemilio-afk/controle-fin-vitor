/**
 * Pure date/money math for credit card billing cycles. No I/O, no Prisma —
 * kept separate so the trickiest rules in the app can be unit tested
 * directly, without a database.
 */

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function dateWithDay(year: number, monthIndex: number, day: number): Date {
  const clampedDay = Math.min(day, lastDayOfMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, clampedDay));
}

/**
 * Shifts a date forward by `months`, keeping the same day-of-month and
 * clamping to the last day when the target month is shorter
 * (e.g. Jan 31 + 1 month -> Feb 28/29).
 */
export function shiftMonths(date: Date, months: number): Date {
  return dateWithDay(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate());
}

export interface BillingCycle {
  closingDate: Date;
  dueDate: Date;
}

/**
 * Resolves which invoice cycle a given date falls into for a card with the
 * given closing/due days.
 *
 * Rule: if the date's day-of-month is on or before the closing day, it
 * belongs to the invoice that closes in the *same* month; otherwise it
 * rolls into next month's invoice. The due date is assumed to always come
 * after the closing date: it lands in the month after closing when the due
 * day is numerically smaller than (or equal to) the closing day, otherwise
 * in the same month.
 */
export function resolveBillingCycle(closingDay: number, dueDay: number, date: Date): BillingCycle {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const closingMonthOffset = day <= closingDay ? 0 : 1;
  const closingDate = dateWithDay(year, month + closingMonthOffset, closingDay);

  const dueMonthOffset = dueDay <= closingDay ? 1 : 0;
  const dueDate = dateWithDay(
    closingDate.getUTCFullYear(),
    closingDate.getUTCMonth() + dueMonthOffset,
    dueDay,
  );

  return { closingDate, dueDate };
}

/**
 * Splits a total amount (in currency units, e.g. reais) into `count`
 * installments that sum back to exactly the original total — no cent lost
 * or invented to floating point rounding. Any remainder cent is handed to
 * the first installments.
 */
export function splitIntoInstallments(total: number, count: number): number[] {
  if (count < 1 || !Number.isInteger(count)) {
    throw new Error("O número de parcelas precisa ser um inteiro maior que zero");
  }

  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) => {
    const cents = baseCents + (index < remainderCents ? 1 : 0);
    return cents / 100;
  });
}
