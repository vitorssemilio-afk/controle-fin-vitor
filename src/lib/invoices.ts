import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCardForUser } from "@/lib/credit-cards";
import { resolveBillingCycle } from "@/lib/billing-cycle";
import { createTransactionForUser } from "@/lib/transactions";
import { getAccountForUser } from "@/lib/accounts";

export class InvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceError";
  }
}

/**
 * Finds the invoice a given date falls into for this card, creating it
 * (as OPEN) if it doesn't exist yet. Invoices are never pre-generated —
 * only the cycles that actually have a purchase land in them exist.
 */
export async function getOrCreateInvoiceForDate(userId: string, cardId: string, date: Date) {
  const card = await getCardForUser(userId, cardId);
  if (!card) {
    throw new InvoiceError("Cartão inválido");
  }

  const { closingDate, dueDate } = resolveBillingCycle(card.closingDay, card.dueDay, date);

  return prisma.invoice.upsert({
    where: { cardId_closingDate: { cardId, closingDate } },
    update: {},
    create: {
      userId,
      cardId,
      closingDate,
      dueDate,
    },
  });
}

function sumCardTransactions(cardTransactions: { amount: Prisma.Decimal }[]) {
  return cardTransactions.reduce((total, t) => total.plus(t.amount), new Prisma.Decimal(0));
}

export async function listInvoicesForCard(userId: string, cardId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { userId, cardId },
    include: { cardTransactions: true },
    orderBy: { closingDate: "desc" },
  });

  return invoices.map((invoice) => ({
    ...invoice,
    total: sumCardTransactions(invoice.cardTransactions),
  }));
}

export async function getInvoiceForUser(userId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      card: true,
      cardTransactions: {
        include: { category: true },
        orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!invoice) {
    return null;
  }

  return { ...invoice, total: sumCardTransactions(invoice.cardTransactions) };
}

export async function closeInvoice(userId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, userId } });
  if (!invoice) {
    throw new InvoiceError("Fatura não encontrada");
  }
  if (invoice.status !== "OPEN") {
    throw new InvoiceError("Só é possível fechar uma fatura aberta");
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CLOSED" },
  });
}

export async function payInvoice(userId: string, invoiceId: string, paymentAccountId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { cardTransactions: true, card: true },
  });
  if (!invoice) {
    throw new InvoiceError("Fatura não encontrada");
  }
  if (invoice.status !== "CLOSED") {
    throw new InvoiceError("Só é possível pagar uma fatura fechada");
  }

  const account = await getAccountForUser(userId, paymentAccountId);
  if (!account) {
    throw new InvoiceError("Conta de pagamento inválida");
  }

  const total = sumCardTransactions(invoice.cardTransactions);
  if (total.lte(0)) {
    throw new InvoiceError("Fatura sem valor não pode ser paga");
  }

  return prisma.$transaction(async (tx) => {
    const paymentTransaction = await createTransactionForUser(
      userId,
      {
        accountId: paymentAccountId,
        type: "CARD_PAYMENT",
        amount: total.toNumber(),
        date: new Date(),
        description: `Fatura ${invoice.card.name}`,
      },
      tx,
    );

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentAccountId,
        paymentTransactionId: paymentTransaction.id,
      },
    });
  });
}
