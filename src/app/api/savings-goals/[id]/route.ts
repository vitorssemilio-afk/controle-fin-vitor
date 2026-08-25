import { NextResponse } from "next/server";
import { deleteSavingsGoalForUser } from "@/lib/savings-goals";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const deleted = await deleteSavingsGoalForUser(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
