import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { payInvoiceSchema } from "@/lib/validation";
import { InvoiceError, payInvoice } from "@/lib/invoices";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { paymentAccountId } = payInvoiceSchema.parse(body);
    const invoice = await payInvoice(userId, id, paymentAccountId);
    return NextResponse.json(invoice);
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
