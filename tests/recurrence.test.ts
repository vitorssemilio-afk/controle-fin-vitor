import { describe, expect, it } from "vitest";
import { nextOccurrence, occurrencesToGenerate } from "@/lib/recurrence";

function d(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

function isoAll(dates: Date[]) {
  return dates.map((date) => date.toISOString().slice(0, 10));
}

describe("nextOccurrence", () => {
  it("semanal avança 7 dias", () => {
    expect(nextOccurrence("WEEKLY", d("2026-03-01")).toISOString().slice(0, 10)).toBe("2026-03-08");
  });

  it("mensal avança 1 mês mantendo o dia", () => {
    expect(nextOccurrence("MONTHLY", d("2026-01-31")).toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("anual avança 12 meses", () => {
    expect(nextOccurrence("YEARLY", d("2026-03-05")).toISOString().slice(0, 10)).toBe("2027-03-05");
  });
});

describe("occurrencesToGenerate", () => {
  it("gera a primeira ocorrência quando a data de início já chegou", () => {
    const occurrences = occurrencesToGenerate({
      frequency: "MONTHLY",
      startDate: d("2026-03-05"),
      lastGeneratedDate: null,
      endDate: null,
      today: d("2026-03-05"),
    });
    expect(isoAll(occurrences)).toEqual(["2026-03-05"]);
  });

  it("não gera nada quando a data de início ainda não chegou", () => {
    const occurrences = occurrencesToGenerate({
      frequency: "MONTHLY",
      startDate: d("2026-04-01"),
      lastGeneratedDate: null,
      endDate: null,
      today: d("2026-03-05"),
    });
    expect(occurrences).toEqual([]);
  });

  it("gera o acumulado de ciclos perdidos de uma vez (usuário que não abre o app há meses)", () => {
    const occurrences = occurrencesToGenerate({
      frequency: "MONTHLY",
      startDate: d("2026-01-05"),
      lastGeneratedDate: null,
      endDate: null,
      today: d("2026-04-10"),
    });
    expect(isoAll(occurrences)).toEqual(["2026-01-05", "2026-02-05", "2026-03-05", "2026-04-05"]);
  });

  it("continua a partir da última ocorrência já gerada, sem duplicar", () => {
    const occurrences = occurrencesToGenerate({
      frequency: "MONTHLY",
      startDate: d("2026-01-05"),
      lastGeneratedDate: d("2026-02-05"),
      endDate: null,
      today: d("2026-04-10"),
    });
    expect(isoAll(occurrences)).toEqual(["2026-03-05", "2026-04-05"]);
  });

  it("respeita a data final da regra", () => {
    const occurrences = occurrencesToGenerate({
      frequency: "MONTHLY",
      startDate: d("2026-01-05"),
      lastGeneratedDate: null,
      endDate: d("2026-02-28"),
      today: d("2026-04-10"),
    });
    expect(isoAll(occurrences)).toEqual(["2026-01-05", "2026-02-05"]);
  });
});
