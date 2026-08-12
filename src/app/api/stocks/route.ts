import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emptyToNull, stockItemSchema } from "@/lib/stock";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const category = request.nextUrl.searchParams.get("category")?.trim() ?? "";

  const items = await prisma.stockItem.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { sku: { contains: search } },
                { name: { contains: search } },
                { description: { contains: search } },
                { location: { contains: search } },
              ],
            }
          : {},
        category ? { category } : {},
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const categories = await prisma.stockItem.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return NextResponse.json({
    items,
    categories: categories
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c)),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = stockItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const item = await prisma.stockItem.create({
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

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
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
      { error: "Failed to create stock item" },
      { status: 500 },
    );
  }
}
