import { notFound } from "next/navigation";
import { requireCurrentUserId } from "@/lib/current-user";
import { getInvoiceForUser } from "@/lib/invoices";
import { listAccountsForUser } from "@/lib/accounts";
import { formatMoney } from "@/lib/format";
import { InvoiceActions } from "@/components/invoice-actions";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  CLOSED: "Fechada",
  PAID: "Paga",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireCurrentUserId();

  const invoice = await getInvoiceForUser(userId, id);
  if (!invoice) {
    notFound();
  }

  const accounts = await listAccountsForUser(userId);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">{invoice.card.name}</h1>
      <p className="text-sm text-ink-soft">
        Fecha {formatDate(invoice.closingDate)} · vence {formatDate(invoice.dueDate)} ·{" "}
        {STATUS_LABELS[invoice.status]}
      </p>
      <p className="font-amount mt-2 text-2xl text-ink">{formatMoney(invoice.total.toString())}</p>

      <InvoiceActions
        invoiceId={invoice.id}
        status={invoice.status}
        accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
      />

      {invoice.cardTransactions.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-soft">Nenhuma compra nesta fatura.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {invoice.cardTransactions.map((cardTransaction) => (
            <li
              key={cardTransaction.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {cardTransaction.description || cardTransaction.category.name}
                </p>
                <p className="text-sm text-ink-soft">
                  {cardTransaction.category.name}
                  {cardTransaction.installmentCount > 1
                    ? ` · ${cardTransaction.installmentNumber}/${cardTransaction.installmentCount}`
                    : ""}
                </p>
              </div>
              <p className="font-amount shrink-0 pl-3 text-ink">
                {formatMoney(cardTransaction.amount.toString())}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
