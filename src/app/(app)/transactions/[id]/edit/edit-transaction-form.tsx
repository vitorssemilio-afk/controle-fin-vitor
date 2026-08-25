"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  TransactionForm,
  type TransactionFormAccount,
  type TransactionFormCategory,
  type TransactionFormValues,
} from "@/components/transaction-form";
import { Button } from "@/components/ui/button";

export function EditTransactionForm({
  transactionId,
  accounts,
  categories,
  initialValues,
}: {
  transactionId: string;
  accounts: TransactionFormAccount[];
  categories: TransactionFormCategory[];
  initialValues: TransactionFormValues;
}) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(values: TransactionFormValues) {
    const response = await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
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

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.error ?? "Não foi possível excluir a transação");
        return;
      }
      router.push("/transactions");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <TransactionForm
      accounts={accounts}
      categories={categories}
      initialValues={initialValues}
      submitLabel="Salvar alterações"
      onSubmit={handleSubmit}
      extra={
        <div className="mt-2 flex flex-col gap-2">
          {deleteError ? <p className="text-sm text-negative">{deleteError}</p> : null}
          <Button type="button" variant="ghost" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? "Excluindo..." : "Excluir transação"}
          </Button>
        </div>
      }
    />
  );
}
