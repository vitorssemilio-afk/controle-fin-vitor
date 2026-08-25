import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { cardPurchaseSchema } from "@/lib/validation";
import { createCardPurchase } from "@/lib/card-transactions";
import { InvoiceError } from "@/lib/invoices";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id: cardId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const input = cardPurchaseSchema.parse(body);
    const purchase = await createCardPurchase(userId, { cardId, ...input });
    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    if (error instanceof InvoiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
