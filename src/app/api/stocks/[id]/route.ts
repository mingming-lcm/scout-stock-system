import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emptyToNull, stockItemSchema } from "@/lib/stock";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = stockItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const item = await prisma.stockItem.update({
      where: { id },
      data: {
        sku: data.sku,
        name: data.name,
        description: emptyToNull(data.description),
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        category: emptyToNull(data.category),
        location: emptyToNull(data.location),
        reorderLevel: data.reorderLevel,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "SKU already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update stock item" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.stockItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete stock item" },
      { status: 500 },
    );
  }
}
