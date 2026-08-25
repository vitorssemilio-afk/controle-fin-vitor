"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";

export interface GoalItem {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  percentage: number;
  targetDateLabel: string;
  linkedAccountName: string | null;
  projectionMessage: string;
  projectionTone: "neutral" | "positive" | "negative";
}

const TONE_CLASS: Record<GoalItem["projectionTone"], string> = {
  neutral: "text-ink-soft",
  positive: "text-positive",
  negative: "text-negative",
};

export function GoalsList({ items }: { items: GoalItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/savings-goals/${id}`, { method: "DELETE" });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">Nenhuma meta cadastrada ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border border-border bg-surface px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-ink">{item.name}</p>
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="text-sm text-ink-soft hover:text-negative disabled:opacity-50"
            >
              Excluir
            </button>
          </div>

          <p className="font-amount mt-1 text-sm text-ink-soft">
            {formatMoney(item.currentAmount)} de {formatMoney(item.targetAmount)} · prazo{" "}
            {item.targetDateLabel}
          </p>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
          </div>

          <p className="mt-2 text-sm text-ink-soft">
            {item.linkedAccountName ? `Conta vinculada: ${item.linkedAccountName}` : "Sem conta vinculada"}
          </p>
          <p className={`text-sm ${TONE_CLASS[item.projectionTone]}`}>{item.projectionMessage}</p>
        </li>
      ))}
    </ul>
  );
}
