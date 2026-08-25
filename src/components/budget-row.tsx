"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatMoney } from "@/lib/format";
import { Input } from "@/components/ui/field";

export interface BudgetRowData {
  categoryId: string;
  categoryName: string;
  limitAmount: string | null;
  spent: string;
  isOverBudget: boolean;
  referenceMonth: string; // ISO date, first day of month
}

export function BudgetRow({ data }: { data: BudgetRowData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [limitInput, setLimitInput] = useState(data.limitAmount ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: data.categoryId,
          referenceMonth: data.referenceMonth,
          limitAmount: limitInput.replace(",", "."),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível salvar o orçamento");
        return;
      }
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const limit = data.limitAmount ? Number(data.limitAmount) : null;
  const spent = Number(data.spent);
  const percentage = limit ? Math.min((spent / limit) * 100, 100) : 0;

  return (
    <div className="rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink">{data.categoryName}</p>
        {isEditing ? (
          <form onSubmit={handleSave} className="flex items-center gap-2">
            <Input
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="0,00"
              className="w-24 py-1"
              autoFocus
            />
            <button type="submit" disabled={isSubmitting} className="text-sm font-medium text-primary">
              Salvar
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-primary"
          >
            {limit ? "Editar" : "Definir orçamento"}
          </button>
        )}
      </div>

      {error ? <p className="mt-1 text-sm text-negative">{error}</p> : null}

      <p className="font-amount mt-1 text-sm text-ink-soft">
        {formatMoney(data.spent)} {limit ? `de ${formatMoney(String(limit))}` : "gastos até agora"}
      </p>

      {limit ? (
        <>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full ${data.isOverBudget ? "bg-negative" : "bg-primary"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {data.isOverBudget ? (
            <p className="mt-1 text-sm font-medium text-negative">Orçamento estourado</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
