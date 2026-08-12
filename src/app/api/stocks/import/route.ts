import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { emptyToNull, mapRowToStockItem } from "@/lib/stock";

function parseSpreadsheet(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf-8");
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message ?? "Failed to parse CSV");
    }

    return parsed.data;
  }

  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
  }

  throw new Error("Unsupported file type. Use CSV, XLS, or XLSX.");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = String(formData.get("mode") ?? "upsert");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseSpreadsheet(buffer, file.name);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const mapped = mapRowToStockItem(row ?? {});

      if (!mapped) {
        skipped += 1;
        errors.push(`Row ${index + 2}: missing SKU/name or invalid values`);
        continue;
      }

      const payload = {
        sku: mapped.sku,
        name: mapped.name,
        description: emptyToNull(mapped.description),
        quantity: mapped.quantity,
        unitPrice: mapped.unitPrice,
        category: emptyToNull(mapped.category),
        location: emptyToNull(mapped.location),
        reorderLevel: mapped.reorderLevel,
      };

      const existing = await prisma.stockItem.findUnique({
        where: { sku: payload.sku },
      });

      if (existing) {
        if (mode === "skip") {
          skipped += 1;
          continue;
        }

        await prisma.stockItem.update({
          where: { sku: payload.sku },
          data: payload,
        });
        updated += 1;
      } else {
        await prisma.stockItem.create({ data: payload });
        created += 1;
      }
    }

    return NextResponse.json({
      created,
      updated,
      skipped,
      total: rows.length,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import stock file",
      },
      { status: 400 },
    );
  }
}
