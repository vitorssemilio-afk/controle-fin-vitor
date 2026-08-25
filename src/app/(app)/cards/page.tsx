import Link from "next/link";
import { requireCurrentUserId } from "@/lib/current-user";
import { listCardsForUser } from "@/lib/credit-cards";
import { NewCardForm } from "@/components/new-card-form";

export default async function CardsPage() {
  const userId = await requireCurrentUserId();
  const cards = await listCardsForUser(userId);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Cartões</h1>

      {cards.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">Você ainda não tem nenhum cartão cadastrado.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/cards/${card.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
              >
                <p className="font-medium text-ink">{card.name}</p>
                <p className="text-sm text-ink-soft">
                  fecha dia {card.closingDay} · vence dia {card.dueDay}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-ink-soft">Novo cartão</h2>
        <div className="mt-2">
          <NewCardForm />
        </div>
      </div>
    </main>
  );
}
