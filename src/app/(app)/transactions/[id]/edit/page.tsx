import { notFound } from "next/navigation";
import { requireCurrentUserId } from "@/lib/current-user";
import { listAccountsForUser } from "@/lib/accounts";
import { listCategoriesForUser } from "@/lib/categories";
import { getTransactionForUser } from "@/lib/transactions";
import { EditTransactionForm } from "./edit-transaction-form";
import type { TransactionFormValues } from "@/components/transaction-form";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireCurrentUserId();

  const [transaction, accounts, categories] = await Promise.all([
    getTransactionForUser(userId, id),
    listAccountsForUser(userId),
    listCategoriesForUser(userId),
  ]);

  if (!transaction) {
    notFound();
  }

  const initialValues: TransactionFormValues = {
    type: transaction.type,
    accountId: transaction.accountId,
    transferAccountId: transaction.transferAccountId ?? "",
    categoryId: transaction.categoryId ?? "",
    amount: transaction.amount.toString(),
    date: transaction.date.toISOString().slice(0, 10),
    description: transaction.description ?? "",
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
      <h1 className="font-heading text-2xl text-ink">Editar transação</h1>
      <div className="mt-6">
        <EditTransactionForm
          transactionId={transaction.id}
          accounts={accounts}
          categories={categories}
          initialValues={initialValues}
        />
      </div>
    </main>
  );
}
