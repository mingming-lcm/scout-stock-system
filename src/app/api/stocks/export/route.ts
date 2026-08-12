import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { stockItemToExportRow } from "@/lib/stock";

export async function GET(request: NextRequest) {
  const format = (request.nextUrl.searchParams.get("format") ?? "csv").toLowerCase();
  const items = await prisma.stockItem.findMany({
    orderBy: [{ sku: "asc" }],
  });

  const rows = items.map(stockItemToExportRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Stock");

  if (format === "xls" || format === "xlsx") {
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: format === "xls" ? "xls" : "xlsx",
    }) as Buffer;

    const filename = format === "xls" ? "stock-export.xls" : "stock-export.xlsx";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          format === "xls"
            ? "application/vnd.ms-excel"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stock-export.csv"',
    },
  });
}
