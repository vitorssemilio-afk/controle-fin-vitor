import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { updateCategorySchema } from "@/lib/validation";
import { updateCategoryForUser } from "@/lib/categories";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

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

    const input = updateCategorySchema.parse(body);
    const updated = await updateCategoryForUser(userId, id, input);
    if (!updated) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    throw error;
  }
}
