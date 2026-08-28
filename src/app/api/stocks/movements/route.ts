import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActionError, applyStockAction } from "@/lib/movements";
import { movementActionSchema } from "@/lib/qr";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? "ACTIVE";
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limit") ?? 50) || 50,
    200,
  );

  const [borrows, movements] = await Promise.all([
    prisma.stockBorrow.findMany({
      where: status === "ALL" ? undefined : { status },
      include: {
        item: {
          select: { id: true, sku: true, name: true, quantity: true },
        },
      },
      orderBy: [{ borrowedAt: "desc" }],
      take: limit,
    }),
    prisma.stockMovement.findMany({
      include: {
        item: {
          select: { id: true, sku: true, name: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    }),
  ]);

  return NextResponse.json({ borrows, movements });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = movementActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await applyStockAction(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to apply stock action" },
      { status: 500 },
    );
  }
}
