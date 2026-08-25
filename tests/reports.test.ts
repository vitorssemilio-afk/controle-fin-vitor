import { describe, expect, it } from "vitest";
import { registerUser } from "@/lib/users";
import { createAccountForUser } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import { createTransactionForUser } from "@/lib/transactions";
import { createCardForUser } from "@/lib/credit-cards";
import { createCardPurchase } from "@/lib/card-transactions";
import { shiftMonths, monthStart } from "@/lib/billing-cycle";
import { getCategoryComparison, getMonthlySummary, getNetWorthHistory } from "@/lib/reports";

const MARCH = new Date("2026-03-15T00:00:00Z");
const FEBRUARY = new Date("2026-02-10T00:00:00Z");

async function setup() {
  const user = await registerUser({
    name: "Vitor",
    email: `vitor-${Math.random()}@example.com`,
    password: "senha1234",
  });
  const checking = await createAccountForUser(user.id, {
    name: "Conta corrente",
    type: "CHECKING",
    currency: "BRL",
    initialBalance: 1000,
  });
  const savings = await createAccountForUser(user.id, {
    name: "Poupança",
    type: "SAVINGS",
    currency: "BRL",
    initialBalance: 0,
  });
  const card = await createCardForUser(user.id, { name: "Cartão", closingDay: 28, dueDay: 5 });
  const categories = await listCategoriesForUser(user.id);
  const mercado = categories.find((c) => c.name === "Mercado")!;
  const lazer = categories.find((c) => c.name === "Lazer")!;
  const salario = categories.find((c) => c.kind === "INCOME")!;

  return { user, checking, savings, card, mercado, lazer, salario };
}

describe("resumo mensal de receitas e despesas", () => {
  it("soma receitas, e despesas somam conta + cartão, sem contar transferência", async () => {
    const { user, checking, savings, card, mercado, salario } = await setup();

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: salario.id,
      type: "INCOME",
      amount: 3000,
      date: MARCH,
    });
    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: mercado.id,
      type: "EXPENSE",
      amount: 200,
      date: MARCH,
    });
    await createCardPurchase(user.id, {
      cardId: card.id,
      categoryId: mercado.id,
      amount: 100,
      purchaseDate: MARCH,
      installments: 1,
    });
    await createTransactionForUser(user.id, {
      accountId: checking.id,
      transferAccountId: savings.id,
      type: "TRANSFER",
      amount: 500,
      date: MARCH,
    });

    const summary = await getMonthlySummary(user.id, MARCH);
    expect(summary.income.toString()).toBe("3000");
    expect(summary.expense.toString()).toBe("300");
  });
});

describe("comparação de gastos por categoria com o mês anterior", () => {
  it("mostra só categorias com movimento em pelo menos um dos dois meses, ordenadas pelo mês atual", async () => {
    const { user, checking, mercado, lazer } = await setup();

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: mercado.id,
      type: "EXPENSE",
      amount: 100,
      date: FEBRUARY,
    });
    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: mercado.id,
      type: "EXPENSE",
      amount: 250,
      date: MARCH,
    });
    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: lazer.id,
      type: "EXPENSE",
      amount: 50,
      date: FEBRUARY,
    });
    // "Lazer" não tem gasto em março, "Mercado" tem nos dois meses

    const comparison = await getCategoryComparison(user.id, MARCH);
    const names = comparison.map((row) => row.categoryName);

    expect(names).toContain("Mercado");
    expect(names).toContain("Lazer");
    expect(comparison[0].categoryName).toBe("Mercado"); // maior gasto este mês vem primeiro

    const mercadoRow = comparison.find((row) => row.categoryName === "Mercado")!;
    expect(mercadoRow.thisMonth.toString()).toBe("250");
    expect(mercadoRow.lastMonth.toString()).toBe("100");

    const lazerRow = comparison.find((row) => row.categoryName === "Lazer")!;
    expect(lazerRow.thisMonth.toString()).toBe("0");
    expect(lazerRow.lastMonth.toString()).toBe("50");
  });

  it("categoria sem gasto em nenhum dos dois meses não aparece", async () => {
    const { user } = await setup();
    const comparison = await getCategoryComparison(user.id, MARCH);
    expect(comparison).toHaveLength(0);
  });
});

describe("evolução do patrimônio", () => {
  it("um lançamento no primeiro dia do mês não vaza para o saldo de fim do mês anterior", async () => {
    const { user, checking } = await setup();
    const today = new Date();

    const oneMonthAgoStart = monthStart(shiftMonths(today, -1));
    const lastDayOfTwoMonthsAgo = new Date(oneMonthAgoStart.getTime() - 86_400_000);

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: (await listCategoriesForUser(user.id)).find((c) => c.kind === "INCOME")!.id,
      type: "INCOME",
      amount: 500,
      date: lastDayOfTwoMonthsAgo,
    });
    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: (await listCategoriesForUser(user.id)).find((c) => c.kind === "INCOME")!.id,
      type: "INCOME",
      amount: 300,
      date: oneMonthAgoStart,
    });

    const history = await getNetWorthHistory(user.id, 3);

    expect(history[0].netWorth.toString()).toBe("1500"); // 1000 + 500, sem o lançamento do mês seguinte
    expect(history[1].netWorth.toString()).toBe("1800"); // 1000 + 500 + 300
    expect(history[2].netWorth.toString()).toBe("1800");
  });
});

describe("isolamento de relatórios entre usuários", () => {
  it("o resumo e a comparação de um usuário não vazam para outro", async () => {
    const { user: userA, checking: checkingA, mercado: mercadoA } = await setup();
    const { user: userB } = await setup();

    await createTransactionForUser(userA.id, {
      accountId: checkingA.id,
      categoryId: mercadoA.id,
      type: "EXPENSE",
      amount: 999,
      date: MARCH,
    });

    const summaryB = await getMonthlySummary(userB.id, MARCH);
    expect(summaryB.expense.toString()).toBe("0");

    const comparisonB = await getCategoryComparison(userB.id, MARCH);
    expect(comparisonB).toHaveLength(0);
  });
});
