import { describe, expect, it } from "vitest";
import { resolveBillingCycle, shiftMonths, splitIntoInstallments } from "@/lib/billing-cycle";

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

describe("resolveBillingCycle", () => {
  it("compra até o dia de fechamento cai na fatura deste mês", () => {
    const { closingDate, dueDate } = resolveBillingCycle(10, 17, new Date("2026-03-05T00:00:00Z"));
    expect(iso(closingDate)).toBe("2026-03-10");
    expect(iso(dueDate)).toBe("2026-03-17");
  });

  it("compra depois do dia de fechamento cai na fatura do mês seguinte", () => {
    const { closingDate, dueDate } = resolveBillingCycle(10, 17, new Date("2026-03-15T00:00:00Z"));
    expect(iso(closingDate)).toBe("2026-04-10");
    expect(iso(dueDate)).toBe("2026-04-17");
  });

  it("vencimento vira o mês seguinte quando o dia de vencimento é menor que o de fechamento", () => {
    const { closingDate, dueDate } = resolveBillingCycle(28, 5, new Date("2026-03-20T00:00:00Z"));
    expect(iso(closingDate)).toBe("2026-03-28");
    expect(iso(dueDate)).toBe("2026-04-05");
  });

  it("vira o ano quando o fechamento cai em janeiro do ano seguinte", () => {
    const { closingDate, dueDate } = resolveBillingCycle(25, 5, new Date("2026-12-28T00:00:00Z"));
    expect(iso(closingDate)).toBe("2027-01-25");
    expect(iso(dueDate)).toBe("2027-02-05");
  });

  it("ajusta o dia de fechamento para o último dia de um mês mais curto", () => {
    const { closingDate } = resolveBillingCycle(31, 10, new Date("2026-02-15T00:00:00Z"));
    // fevereiro de 2026 tem 28 dias
    expect(iso(closingDate)).toBe("2026-02-28");
  });
});

describe("shiftMonths", () => {
  it("mantém o dia e avança o mês", () => {
    expect(iso(shiftMonths(new Date("2026-01-05T00:00:00Z"), 2))).toBe("2026-03-05");
  });

  it("ajusta para o último dia quando o mês de destino é mais curto", () => {
    expect(iso(shiftMonths(new Date("2026-01-31T00:00:00Z"), 1))).toBe("2026-02-28");
  });
});

describe("splitIntoInstallments", () => {
  it("divide um valor exato igualmente", () => {
    expect(splitIntoInstallments(300, 3)).toEqual([100, 100, 100]);
  });

  it("distribui os centavos da sobra nas primeiras parcelas, sem perder nem inventar centavo", () => {
    const installments = splitIntoInstallments(100, 3);
    expect(installments).toEqual([33.34, 33.33, 33.33]);

    const totalCents = installments.reduce((sum, value) => sum + Math.round(value * 100), 0);
    expect(totalCents).toBe(10000);
  });

  it("uma parcela só devolve o valor total", () => {
    expect(splitIntoInstallments(150.5, 1)).toEqual([150.5]);
  });

  it("rejeita número de parcelas inválido", () => {
    expect(() => splitIntoInstallments(100, 0)).toThrow();
  });
});
