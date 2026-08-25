"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";

export interface RecurringItem {
  id: string;
  description: string | null;
  categoryName: string;
  accountName: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
}

const FREQUENCY_LABELS = { WEEKLY: "toda semana", MONTHLY: "todo mês", YEARLY: "todo ano" };

export function RecurringList({ items }: { items: RecurringItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, { method: "DELETE" });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">Nenhuma recorrência cadastrada ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{item.description || item.categoryName}</p>
            <p className="text-sm text-ink-soft">
              {item.categoryName} · {item.accountName} · {FREQUENCY_LABELS[item.frequency]}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 pl-3">
            <p className={`font-amount ${item.type === "INCOME" ? "text-positive" : "text-negative"}`}>
              {item.type === "INCOME" ? "+" : "-"}
              {formatMoney(item.amount)}
            </p>
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="text-sm text-ink-soft hover:text-negative disabled:opacity-50"
            >
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
