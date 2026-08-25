import { prisma } from "@/lib/prisma";
import { getCardForUser } from "@/lib/credit-cards";
import { getCategoryForUser } from "@/lib/categories";
import { getOrCreateInvoiceForDate, InvoiceError } from "@/lib/invoices";
import { shiftMonths, splitIntoInstallments } from "@/lib/billing-cycle";

export interface CardPurchaseInput {
  cardId: string;
  categoryId: string;
  amount: number;
  purchaseDate: Date;
  description?: string | null;
  installments: number;
}

export async function createCardPurchase(userId: string, input: CardPurchaseInput) {
  const card = await getCardForUser(userId, input.cardId);
  if (!card) {
    throw new InvoiceError("Cartão inválido");
  }
  if (input.amount <= 0) {
    throw new InvoiceError("O valor precisa ser maior que zero");
  }
  const category = await getCategoryForUser(userId, input.categoryId);
  if (!category) {
    throw new InvoiceError("Categoria inválida");
  }
  if (category.kind !== "EXPENSE") {
    throw new InvoiceError("Compras no cartão só podem usar categorias de despesa");
  }

  const installments = splitIntoInstallments(input.amount, input.installments);
  const purchaseGroupId = crypto.randomUUID();

  const created = [];
  for (let index = 0; index < installments.length; index += 1) {
    const cycleDate = index === 0 ? input.purchaseDate : shiftMonths(input.purchaseDate, index);
    const invoice = await getOrCreateInvoiceForDate(userId, input.cardId, cycleDate);
    if (invoice.status !== "OPEN") {
      throw new InvoiceError(
        `A fatura de ${invoice.closingDate.toLocaleDateString("pt-BR")} já está fechada`,
      );
    }

    const cardTransaction = await prisma.cardTransaction.create({
      data: {
        userId,
        invoiceId: invoice.id,
        categoryId: input.categoryId,
        purchaseGroupId,
        installmentNumber: index + 1,
        installmentCount: installments.length,
        description: input.description ?? null,
        amount: installments[index],
        purchaseDate: input.purchaseDate,
      },
    });
    created.push(cardTransaction);
  }

  return created;
}

export function listCardTransactionsForInvoice(userId: string, invoiceId: string) {
  return prisma.cardTransaction.findMany({
    where: { userId, invoiceId },
    include: { category: true },
    orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
  });
}
