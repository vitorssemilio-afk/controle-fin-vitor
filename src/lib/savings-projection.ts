import { shiftMonths } from "@/lib/billing-cycle";

export type GoalProjection =
  | { status: "no-account" }
  | { status: "insufficient-data" }
  | { status: "reached" }
  | { status: "not-on-track" }
  | { status: "projected"; monthsRemaining: number; projectedDate: Date };

const MIN_DAYS_FOR_PROJECTION = 30;
const DAYS_PER_MONTH = 30;

/**
 * Projects when a savings goal will be reached at its current pace.
 * Deliberately refuses to guess when the data can't support a real answer
 * (goal not linked to an account, too little history, or money isn't
 * actually flowing in) — those return an honest status instead of a
 * fabricated date.
 */
export function projectGoalCompletion({
  hasLinkedAccount,
  targetAmount,
  currentAmount,
  netChangeSinceStart,
  daysElapsed,
  today,
}: {
  hasLinkedAccount: boolean;
  targetAmount: number;
  currentAmount: number;
  netChangeSinceStart: number;
  daysElapsed: number;
  today: Date;
}): GoalProjection {
  if (!hasLinkedAccount) {
    return { status: "no-account" };
  }

  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) {
    return { status: "reached" };
  }

  if (daysElapsed < MIN_DAYS_FOR_PROJECTION) {
    return { status: "insufficient-data" };
  }

  const monthlyRate = netChangeSinceStart / (daysElapsed / DAYS_PER_MONTH);
  if (monthlyRate <= 0) {
    return { status: "not-on-track" };
  }

  const monthsRemaining = remaining / monthlyRate;
  const projectedDate = shiftMonths(today, Math.ceil(monthsRemaining));

  return { status: "projected", monthsRemaining, projectedDate };
}
