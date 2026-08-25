import { describe, expect, it } from "vitest";
import { projectGoalCompletion } from "@/lib/savings-projection";

const TODAY = new Date("2026-01-15T00:00:00Z");

describe("projectGoalCompletion", () => {
  it("sem conta vinculada, não projeta nada", () => {
    const result = projectGoalCompletion({
      hasLinkedAccount: false,
      targetAmount: 1000,
      currentAmount: 0,
      netChangeSinceStart: 0,
      daysElapsed: 100,
      today: TODAY,
    });
    expect(result).toEqual({ status: "no-account" });
  });

  it("meta já atingida, mesmo com pouco histórico", () => {
    const result = projectGoalCompletion({
      hasLinkedAccount: true,
      targetAmount: 1000,
      currentAmount: 1200,
      netChangeSinceStart: 1200,
      daysElapsed: 5,
      today: TODAY,
    });
    expect(result).toEqual({ status: "reached" });
  });

  it("menos de 30 dias de histórico não projeta uma data", () => {
    const result = projectGoalCompletion({
      hasLinkedAccount: true,
      targetAmount: 1000,
      currentAmount: 100,
      netChangeSinceStart: 100,
      daysElapsed: 10,
      today: TODAY,
    });
    expect(result).toEqual({ status: "insufficient-data" });
  });

  it("ritmo zero ou negativo não projeta uma data", () => {
    const result = projectGoalCompletion({
      hasLinkedAccount: true,
      targetAmount: 1000,
      currentAmount: 100,
      netChangeSinceStart: -50,
      daysElapsed: 90,
      today: TODAY,
    });
    expect(result).toEqual({ status: "not-on-track" });
  });

  it("projeta a data no ritmo médio desde a criação da meta", () => {
    const result = projectGoalCompletion({
      hasLinkedAccount: true,
      targetAmount: 1200,
      currentAmount: 200,
      netChangeSinceStart: 300, // R$100/mês em 90 dias (3 meses)
      daysElapsed: 90,
      today: TODAY,
    });

    expect(result.status).toBe("projected");
    if (result.status === "projected") {
      expect(result.monthsRemaining).toBe(10); // faltam 1000, a 100/mês
      expect(result.projectedDate.toISOString().slice(0, 10)).toBe("2026-11-15");
    }
  });
});
