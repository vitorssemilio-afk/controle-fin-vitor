import { prisma } from "@/lib/prisma";
import { monthStart, shiftMonths } from "@/lib/billing-cycle";

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferência",
  CARD_PAYMENT: "Pagamento de fatura",
};

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map(csvField).join(",");
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface CsvRow {
  date: Date;
  type: string;
  account: string;
  category: string;
  description: string;
  amount: string;
}

/**
 * A downloadable statement for one month: every regular transaction plus
 * every card purchase, sorted by date. Card purchases are listed by the
 * card's name (there's no bank account debit yet — see Fase 3) so the
 * export always matches what actually happened, not just cash movements.
 */
export async function buildTransactionsCsv(userId: string, referenceMonth: Date): Promise<string> {
  const start = monthStart(referenceMonth);
  const end = shiftMonths(start, 1);

  const [transactions, cardTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { account: true, category: true },
    }),
    prisma.cardTransaction.findMany({
      where: { userId, purchaseDate: { gte: start, lt: end } },
      include: { category: true, invoice: { include: { card: true } } },
    }),
  ]);

  const rows: CsvRow[] = [
    ...transactions.map((t) => ({
      date: t.date,
      type: TYPE_LABELS[t.type] ?? t.type,
      account: t.account.name,
      category: t.category?.name ?? "",
      description: t.description ?? "",
      amount: t.amount.toString(),
    })),
    ...cardTransactions.map((c) => ({
      date: c.purchaseDate,
      type: "Compra no cartão",
      account: c.invoice.card.name,
      category: c.category.name,
      description:
        c.installmentCount > 1
          ? `${c.description ?? ""} (${c.installmentNumber}/${c.installmentCount})`.trim()
          : (c.description ?? ""),
      amount: c.amount.toString(),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const header = csvRow(["Data", "Tipo", "Conta", "Categoria", "Descrição", "Valor"]);
  const body = rows.map((row) =>
    csvRow([
      formatDate(row.date),
      row.type,
      row.account,
      row.category,
      row.description,
      row.amount,
    ]),
  );

  return [header, ...body].join("\n");
}
