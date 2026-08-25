"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export interface SavingsAccountOption {
  id: string;
  name: string;
}

export function NewGoalForm({ savingsAccounts }: { savingsAccounts: SavingsAccountOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/savings-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetAmount: targetAmount.replace(",", "."),
          targetDate,
          linkedAccountId: linkedAccountId || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível criar a meta");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nome da meta" htmlFor="goal-name">
        <Input
          id="goal-name"
          placeholder="Ex.: Viagem, Reserva de emergência"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor alvo" htmlFor="goal-amount">
          <Input
            id="goal-amount"
            inputMode="decimal"
            placeholder="0,00"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Prazo" htmlFor="goal-date">
          <Input
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Conta poupança vinculada (opcional)" htmlFor="goal-account">
        <Select
          id="goal-account"
          value={linkedAccountId}
          onChange={(e) => setLinkedAccountId(e.target.value)}
        >
          <option value="">Nenhuma</option>
          {savingsAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>

      {error ? <p className="text-sm text-negative">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Criando..." : "Criar meta"}
      </Button>
    </form>
  );
}
