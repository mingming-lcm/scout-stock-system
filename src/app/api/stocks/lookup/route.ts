import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeStockQr } from "@/lib/qr";

export async function GET(request: NextRequest) {
  const raw =
    request.nextUrl.searchParams.get("code") ??
    request.nextUrl.searchParams.get("sku") ??
    "";

  const sku = decodeStockQr(raw) ?? raw.trim();
  if (!sku) {
    return NextResponse.json({ error: "SKU or QR code required" }, { status: 400 });
  }

  const item = await prisma.stockItem.findUnique({
    where: { sku },
    include: {
      borrows: {
        where: { status: "ACTIVE" },
        orderBy: { borrowedAt: "desc" },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: `SKU not found: ${sku}` }, { status: 404 });
  }

  return NextResponse.json({ item });
}
