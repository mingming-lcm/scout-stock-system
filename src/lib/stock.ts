import { z } from "zod";

export const stockItemSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  quantity: z.coerce.number().int().min(0).default(0),
  unitPrice: z.coerce.number().min(0).default(0),
  category: z.string().trim().max(100).optional().nullable(),
  location: z.string().trim().max(100).optional().nullable(),
  reorderLevel: z.coerce.number().int().min(0).default(0),
});

export type StockItemInput = z.infer<typeof stockItemSchema>;

export const EXPORT_HEADERS = [
  "SKU",
  "Name",
  "Description",
  "Quantity",
  "Unit Price",
  "Category",
  "Location",
  "Reorder Level",
] as const;

const HEADER_ALIASES: Record<string, keyof StockItemInput> = {
  sku: "sku",
  "stock keeping unit": "sku",
  name: "name",
  product: "name",
  "product name": "name",
  description: "description",
  qty: "quantity",
  quantity: "quantity",
  stock: "quantity",
  "unit price": "unitPrice",
  unitprice: "unitPrice",
  price: "unitPrice",
  category: "category",
  location: "location",
  warehouse: "location",
  "reorder level": "reorderLevel",
  reorderlevel: "reorderLevel",
  "reorder qty": "reorderLevel",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function mapRowToStockItem(
  row: Record<string, unknown>,
): StockItemInput | null {
  const mapped: Record<string, unknown> = {};

  for (const [rawKey, value] of Object.entries(row)) {
    const field = HEADER_ALIASES[normalizeHeader(rawKey)];
    if (!field) continue;
    if (value === undefined || value === null || value === "") {
      continue;
    }
    mapped[field] = value;
  }

  if (!mapped.sku && !mapped.name) return null;

  const parsed = stockItemSchema.safeParse({
    sku: mapped.sku ?? "",
    name: mapped.name ?? "",
    description: mapped.description ?? null,
    quantity: mapped.quantity ?? 0,
    unitPrice: mapped.unitPrice ?? 0,
    category: mapped.category ?? null,
    location: mapped.location ?? null,
    reorderLevel: mapped.reorderLevel ?? 0,
  });

  return parsed.success ? parsed.data : null;
}

export function stockItemToExportRow(item: {
  sku: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  category: string | null;
  location: string | null;
  reorderLevel: number;
}) {
  return {
    SKU: item.sku,
    Name: item.name,
    Description: item.description ?? "",
    Quantity: item.quantity,
    "Unit Price": item.unitPrice,
    Category: item.category ?? "",
    Location: item.location ?? "",
    "Reorder Level": item.reorderLevel,
  };
}

export function emptyToNull(value?: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
