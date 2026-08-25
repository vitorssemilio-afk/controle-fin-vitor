import { describe, expect, it } from "vitest";
import { registerUser } from "@/lib/users";
import { createAccountForUser } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import { createTransactionForUser } from "@/lib/transactions";
import { createCardForUser } from "@/lib/credit-cards";
import { createCardPurchase } from "@/lib/card-transactions";
import {
  computeCategorySpending,
  InvalidBudgetError,
  listBudgetOverviewForUser,
  upsertBudgetForUser,
} from "@/lib/budgets";

const MARCH = new Date("2026-03-15T00:00:00Z");

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
    initialBalance: 5000,
  });
  const card = await createCardForUser(user.id, { name: "Cartão", closingDay: 28, dueDay: 5 });
  const categories = await listCategoriesForUser(user.id);
  const mercado = categories.find((c) => c.name === "Mercado")!;
  const lazer = categories.find((c) => c.name === "Lazer")!;
  const salario = categories.find((c) => c.kind === "INCOME")!;

  return { user, checking, card, mercado, lazer, salario };
}

describe("cálculo de gasto por categoria", () => {
  it("soma despesas em dinheiro/débito e compras no cartão, mas nada mais", async () => {
    const { user, checking, card, mercado, salario } = await setup();

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: mercado.id,
      type: "EXPENSE",
      amount: 100,
      date: MARCH,
    });
    await createCardPurchase(user.id, {
      cardId: card.id,
      categoryId: mercado.id,
      amount: 50,
      purchaseDate: MARCH,
      installments: 1,
    });
    // receita na mesma categoria de despesa não existe, mas uma receita qualquer
    // não pode vazar para o gasto de "Mercado"
    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: salario.id,
      type: "INCOME",
      amount: 3000,
      date: MARCH,
    });

    const spending = await computeCategorySpending(user.id, MARCH);
    expect(spending.get(mercado.id)?.toString()).toBe("150");
    expect(spending.has(salario.id)).toBe(false);
  });

  it("não soma despesas de outro mês", async () => {
    const { user, checking, mercado } = await setup();

    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: mercado.id,
      type: "EXPENSE",
      amount: 100,
      date: new Date("2026-02-15T00:00:00Z"),
    });

    const spending = await computeCategorySpending(user.id, MARCH);
    expect(spending.has(mercado.id)).toBe(false);
  });
});

describe("orçamento e alerta de estouro", () => {
  it("marca isOverBudget quando o gasto passa do limite", async () => {
    const { user, checking, mercado, lazer } = await setup();

    await upsertBudgetForUser(user.id, {
      categoryId: mercado.id,
      referenceMonth: MARCH,
      limitAmount: 200,
    });
    await createTransactionForUser(user.id, {
      accountId: checking.id,
      categoryId: mercado.id,
      type: "EXPENSE",
      amount: 250,
      date: MARCH,
    });

    const overview = await listBudgetOverviewForUser(user.id, MARCH);
    const mercadoOverview = overview.find((o) => o.categoryId === mercado.id)!;
    const lazerOverview = overview.find((o) => o.categoryId === lazer.id)!;

    expect(mercadoOverview.isOverBudget).toBe(true);
    // categoria sem orçamento definido não deve ser marcada como estourada
    expect(lazerOverview.limitAmount).toBeNull();
    expect(lazerOverview.isOverBudget).toBe(false);
  });

  it("definir o orçamento de novo no mesmo mês atualiza o limite, não duplica", async () => {
    const { user, mercado } = await setup();

    await upsertBudgetForUser(user.id, { categoryId: mercado.id, referenceMonth: MARCH, limitAmount: 200 });
    await upsertBudgetForUser(user.id, { categoryId: mercado.id, referenceMonth: MARCH, limitAmount: 300 });

    const overview = await listBudgetOverviewForUser(user.id, MARCH);
    const mercadoOverview = overview.find((o) => o.categoryId === mercado.id)!;
    expect(mercadoOverview.limitAmount?.toString()).toBe("300");
  });

  it("rejeita orçamento para categoria de receita", async () => {
    const { user, salario } = await setup();

    await expect(
      upsertBudgetForUser(user.id, { categoryId: salario.id, referenceMonth: MARCH, limitAmount: 100 }),
    ).rejects.toThrow(InvalidBudgetError);
  });
});

describe("isolamento de orçamentos entre usuários", () => {
  it("o gasto e o orçamento de um usuário não vazam para outro", async () => {
    const { user: userA, checking: checkingA, mercado: mercadoA } = await setup();
    const { user: userB } = await setup();

    await createTransactionForUser(userA.id, {
      accountId: checkingA.id,
      categoryId: mercadoA.id,
      type: "EXPENSE",
      amount: 500,
      date: MARCH,
    });
    await upsertBudgetForUser(userA.id, {
      categoryId: mercadoA.id,
      referenceMonth: MARCH,
      limitAmount: 100,
    });

    const overviewB = await listBudgetOverviewForUser(userB.id, MARCH);
    expect(overviewB.every((o) => o.spent.toString() === "0")).toBe(true);
    expect(overviewB.every((o) => o.limitAmount === null)).toBe(true);
  });
});
