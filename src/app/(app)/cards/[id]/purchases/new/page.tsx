import { notFound } from "next/navigation";
import { requireCurrentUserId } from "@/lib/current-user";
import { getCardForUser } from "@/lib/credit-cards";
import { listCategoriesForUser } from "@/lib/categories";
import { NewCardPurchaseForm } from "@/components/new-card-purchase-form";

export default async function NewCardPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireCurrentUserId();

  const card = await getCardForUser(userId, id);
  if (!card) {
    notFound();
  }

  const categories = await listCategoriesForUser(userId);
  const expenseCategories = categories.filter((category) => category.kind === "EXPENSE");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Nova compra — {card.name}</h1>
      <div className="mt-6">
        <NewCardPurchaseForm cardId={card.id} categories={expenseCategories} />
      </div>
    </main>
  );
}
