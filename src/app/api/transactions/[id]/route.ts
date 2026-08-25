import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { transactionSchema } from "@/lib/validation";
import {
  deleteTransactionForUser,
  getTransactionForUser,
  InvalidTransactionError,
  updateTransactionForUser,
} from "@/lib/transactions";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const transaction = await getTransactionForUser(userId, id);
    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }
    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const input = transactionSchema.parse(body);
    const updated = await updateTransactionForUser(userId, id, input);
    if (!updated) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    if (error instanceof InvalidTransactionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const deleted = await deleteTransactionForUser(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
