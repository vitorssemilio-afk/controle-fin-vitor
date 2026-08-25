"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

export interface InvoiceAccount {
  id: string;
  name: string;
}

export function InvoiceActions({
  invoiceId,
  status,
  accounts,
}: {
  invoiceId: string;
  status: "OPEN" | "CLOSED" | "PAID";
  accounts: InvoiceAccount[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState(accounts[0]?.id ?? "");

  async function handleClose() {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/close`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível fechar a fatura");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePay() {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentAccountId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível pagar a fatura");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "PAID") {
    return null;
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      {status === "OPEN" ? (
        <Button type="button" variant="ghost" disabled={isSubmitting} onClick={handleClose}>
          {isSubmitting ? "Fechando..." : "Fechar fatura"}
        </Button>
      ) : (
        <>
          <Field label="Pagar com" htmlFor="paymentAccountId">
            <Select
              id="paymentAccountId"
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(e.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" disabled={isSubmitting || !paymentAccountId} onClick={handlePay}>
            {isSubmitting ? "Pagando..." : "Pagar fatura"}
          </Button>
        </>
      )}
      {error ? <p className="text-sm text-negative">{error}</p> : null}
    </div>
  );
}
