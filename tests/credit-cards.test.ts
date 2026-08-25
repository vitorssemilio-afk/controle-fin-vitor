import { describe, expect, it } from "vitest";
import { registerUser } from "@/lib/users";
import { createAccountForUser, computeAccountBalances } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import { createCardForUser } from "@/lib/credit-cards";
import { createCardPurchase } from "@/lib/card-transactions";
import { closeInvoice, getInvoiceForUser, InvoiceError, payInvoice } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";

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
  const card = await createCardForUser(user.id, {
    name: "Cartão",
    closingDay: 10,
    dueDay: 17,
  });
  const categories = await listCategoriesForUser(user.id);
  const expenseCategory = categories.find((c) => c.kind === "EXPENSE")!;
  const incomeCategory = categories.find((c) => c.kind === "INCOME")!;

  return { user, checking, card, expenseCategory, incomeCategory };
}

describe("lançamento de compra no cartão", () => {
  it("uma compra à vista cai em uma única fatura, sem afetar o saldo da conta", async () => {
    const { user, checking, card, expenseCategory } = await setup();

    await createCardPurchase(user.id, {
      cardId: card.id,
      categoryId: expenseCategory.id,
      amount: 150,
      purchaseDate: new Date("2026-03-05T00:00:00Z"),
      installments: 1,
    });

    const cardTransactions = await prisma.cardTransaction.findMany({ where: { userId: user.id } });
    expect(cardTransactions).toHaveLength(1);

    const invoice = await getInvoiceForUser(user.id, cardTransactions[0].invoiceId);
    expect(invoice?.closingDate.toISOString().slice(0, 10)).toBe("2026-03-10");
    expect(invoice?.total.toString()).toBe("150");

    // a compra no cartão não debita a conta — só o pagamento da fatura debita
    const balances = await computeAccountBalances(user.id);
    expect(balances.get(checking.id)?.toString()).toBe("5000");
  });

  it("uma compra parcelada distribui as parcelas por faturas seguintes", async () => {
    const { user, card, expenseCategory } = await setup();

    const created = await createCardPurchase(user.id, {
      cardId: card.id,
      categoryId: expenseCategory.id,
      amount: 100,
      purchaseDate: new Date("2026-03-05T00:00:00Z"),
      installments: 3,
    });

    expect(created).toHaveLength(3);
    expect(created.map((c) => c.amount.toString())).toEqual(["33.34", "33.33", "33.33"]);

    const invoices = await Promise.all(
      created.map((c) => getInvoiceForUser(user.id, c.invoiceId)),
    );
    const closingDates = invoices.map((i) => i?.closingDate.toISOString().slice(0, 10));
    expect(closingDates).toEqual(["2026-03-10", "2026-04-10", "2026-05-10"]);
  });

  it("rejeita categoria de receita para compra no cartão", async () => {
    const { user, card, incomeCategory } = await setup();

    await expect(
      createCardPurchase(user.id, {
        cardId: card.id,
        categoryId: incomeCategory.id,
        amount: 50,
        purchaseDate: new Date("2026-03-05T00:00:00Z"),
        installments: 1,
      }),
    ).rejects.toThrow(InvoiceError);
  });

  it("rejeita lançamento em uma fatura já fechada", async () => {
    const { user, card, expenseCategory } = await setup();

    const [firstPurchase] = await createCardPurchase(user.id, {
      cardId: card.id,
      categoryId: expenseCategory.id,
      amount: 50,
      purchaseDate: new Date("2026-03-05T00:00:00Z"),
      installments: 1,
    });

    await closeInvoice(user.id, firstPurchase.invoiceId);

    await expect(
      createCardPurchase(user.id, {
        cardId: card.id,
        categoryId: expenseCategory.id,
        amount: 30,
        purchaseDate: new Date("2026-03-08T00:00:00Z"), // mesmo ciclo (fecha dia 10)
        installments: 1,
      }),
    ).rejects.toThrow(InvoiceError);
  });
});

describe("fechamento e pagamento de fatura", () => {
  it("fatura só pode ser paga depois de fechada, e o pagamento debita a conta escolhida", async () => {
    const { user, checking, card, expenseCategory } = await setup();

    const [purchase] = await createCardPurchase(user.id, {
      cardId: card.id,
      categoryId: expenseCategory.id,
      amount: 200,
      purchaseDate: new Date("2026-03-05T00:00:00Z"),
      installments: 1,
    });

    await expect(payInvoice(user.id, purchase.invoiceId, checking.id)).rejects.toThrow(InvoiceError);

    await closeInvoice(user.id, purchase.invoiceId);
    const paid = await payInvoice(user.id, purchase.invoiceId, checking.id);

    expect(paid.status).toBe("PAID");
    expect(paid.paymentTransactionId).not.toBeNull();

    const balances = await computeAccountBalances(user.id);
    // 5000 (inicial) - 200 (pagamento da fatura)
    expect(balances.get(checking.id)?.toString()).toBe("4800");

    // pagar de novo deve falhar
    await expect(payInvoice(user.id, purchase.invoiceId, checking.id)).rejects.toThrow(InvoiceError);
  });

  it("o pagamento da fatura não conta como despesa por categoria (evita contar o gasto duas vezes)", async () => {
    const { user, checking, card, expenseCategory } = await setup();

    const [purchase] = await createCardPurchase(user.id, {
      cardId: card.id,
      categoryId: expenseCategory.id,
      amount: 200,
      purchaseDate: new Date("2026-03-05T00:00:00Z"),
      installments: 1,
    });
    await closeInvoice(user.id, purchase.invoiceId);
    await payInvoice(user.id, purchase.invoiceId, checking.id);

    const paymentTransactions = await prisma.transaction.findMany({
      where: { userId: user.id, type: "CARD_PAYMENT" },
    });
    expect(paymentTransactions).toHaveLength(1);
    expect(paymentTransactions[0].categoryId).toBeNull();
  });
});

describe("isolamento de cartões e faturas entre usuários", () => {
  it("um usuário não enxerga nem fecha/paga a fatura de outro", async () => {
    const { user: userA, card: cardA, expenseCategory: categoryA } = await setup();
    const { user: userB, checking: checkingB } = await setup();

    const [purchase] = await createCardPurchase(userA.id, {
      cardId: cardA.id,
      categoryId: categoryA.id,
      amount: 100,
      purchaseDate: new Date("2026-03-05T00:00:00Z"),
      installments: 1,
    });

    expect(await getInvoiceForUser(userB.id, purchase.invoiceId)).toBeNull();
    await expect(closeInvoice(userB.id, purchase.invoiceId)).rejects.toThrow(InvoiceError);
    await expect(payInvoice(userB.id, purchase.invoiceId, checkingB.id)).rejects.toThrow(InvoiceError);
  });
});
