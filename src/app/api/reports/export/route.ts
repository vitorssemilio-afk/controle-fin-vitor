import { NextResponse } from "next/server";
import { buildTransactionsCsv } from "@/lib/csv-export";
import { requireCurrentUserId, UnauthenticatedError } from "@/lib/current-user";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");

    const referenceMonth =
      monthParam && /^\d{4}-\d{2}$/.test(monthParam)
        ? new Date(Date.UTC(Number(monthParam.slice(0, 4)), Number(monthParam.slice(5, 7)) - 1, 1))
        : new Date();

    const csv = await buildTransactionsCsv(userId, referenceMonth);
    const fileMonth = `${referenceMonth.getUTCFullYear()}-${String(referenceMonth.getUTCMonth() + 1).padStart(2, "0")}`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transacoes-${fileMonth}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
