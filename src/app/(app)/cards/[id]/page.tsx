import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUserId } from "@/lib/current-user";
import { getCardForUser } from "@/lib/credit-cards";
import { listInvoicesForCard } from "@/lib/invoices";
import { formatMoney } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  CLOSED: "Fechada",
  PAID: "Paga",
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: "text-ink-soft",
  CLOSED: "text-negative",
  PAID: "text-positive",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireCurrentUserId();

  const card = await getCardForUser(userId, id);
  if (!card) {
    notFound();
  }

  const invoices = await listInvoicesForCard(userId, id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-ink">{card.name}</h1>
          <p className="text-sm text-ink-soft">
            fecha dia {card.closingDay} · vence dia {card.dueDay}
          </p>
        </div>
        <Link href={`/cards/${card.id}/purchases/new`} className="text-sm font-medium text-primary">
          + Nova compra
        </Link>
      </div>

      {invoices.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-soft">
          Nenhuma fatura ainda. Lance uma compra para começar.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">
                    Fecha {formatDate(invoice.closingDate)} · vence {formatDate(invoice.dueDate)}
                  </p>
                  <p className={`text-sm ${STATUS_COLOR[invoice.status]}`}>
                    {STATUS_LABELS[invoice.status]}
                  </p>
                </div>
                <p className="font-amount text-ink">{formatMoney(invoice.total.toString())}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
