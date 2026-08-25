"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export interface PurchaseCategory {
  id: string;
  name: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function NewCardPurchaseForm({
  cardId,
  categories,
}: {
  cardId: string;
  categories: PurchaseCategory[];
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [description, setDescription] = useState("");
  const [installments, setInstallments] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/cards/${cardId}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          amount: amount.replace(",", "."),
          purchaseDate,
          description: description || undefined,
          installments: Number(installments),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível lançar a compra");
        return;
      }
      router.push(`/cards/${cardId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Categoria" htmlFor="categoryId">
        <Select id="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor total" htmlFor="amount">
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Data da compra" htmlFor="purchaseDate">
          <Input
            id="purchaseDate"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Parcelas" htmlFor="installments">
        <Input
          id="installments"
          type="number"
          min={1}
          max={48}
          value={installments}
          onChange={(e) => setInstallments(e.target.value)}
          required
        />
      </Field>

      <Field label="Descrição (opcional)" htmlFor="description">
        <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      {error ? <p className="text-sm text-negative">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Salvando..." : "Lançar compra"}
      </Button>
    </form>
  );
}
