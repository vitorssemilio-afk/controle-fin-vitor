"use client";

import { useRouter } from "next/navigation";
import {
  emptyTransactionFormValues,
  TransactionForm,
  type TransactionFormAccount,
  type TransactionFormCategory,
  type TransactionFormValues,
} from "@/components/transaction-form";

export function NewTransactionForm({
  accounts,
  categories,
}: {
  accounts: TransactionFormAccount[];
  categories: TransactionFormCategory[];
}) {
  const router = useRouter();

  async function handleSubmit(values: TransactionFormValues) {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: values.type,
        accountId: values.accountId,
        transferAccountId: values.type === "TRANSFER" ? values.transferAccountId : undefined,
        categoryId: values.type === "TRANSFER" ? undefined : values.categoryId,
        amount: values.amount.replace(",", "."),
        date: values.date,
        description: values.description || undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return data.error ?? "Não foi possível salvar a transação";
    }

    router.push("/transactions");
    router.refresh();
    return null;
  }

  return (
    <TransactionForm
      accounts={accounts}
      categories={categories}
      initialValues={emptyTransactionFormValues()}
      submitLabel="Salvar"
      onSubmit={handleSubmit}
    />
  );
}
