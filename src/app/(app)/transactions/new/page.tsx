import { requireCurrentUserId } from "@/lib/current-user";
import { listAccountsForUser } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import { NewTransactionForm } from "./new-transaction-form";

export default async function NewTransactionPage() {
  const userId = await requireCurrentUserId();
  const [accounts, categories] = await Promise.all([
    listAccountsForUser(userId),
    listCategoriesForUser(userId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Nova transação</h1>
      <div className="mt-6">
        <NewTransactionForm accounts={accounts} categories={categories} />
      </div>
    </main>
  );
}
