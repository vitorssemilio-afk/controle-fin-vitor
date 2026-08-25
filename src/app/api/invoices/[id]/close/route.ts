import { NextResponse } from "next/server";
import { closeInvoice, InvoiceError } from "@/lib/invoices";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const invoice = await closeInvoice(userId, id);
    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof InvoiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
