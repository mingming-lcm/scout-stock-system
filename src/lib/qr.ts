import { z } from "zod";

export const MOVEMENT_TYPES = [
  "STOCK_IN",
  "STOCK_OUT",
  "BORROW",
  "RETURN",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const QR_PREFIX = "SCOUT:";

export function encodeStockQr(sku: string) {
  return `${QR_PREFIX}${sku.trim()}`;
}

export function decodeStockQr(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.toUpperCase().startsWith(QR_PREFIX)) {
    const sku = value.slice(QR_PREFIX.length).trim();
    return sku || null;
  }

  try {
    const parsed = JSON.parse(value) as { sku?: unknown };
    if (typeof parsed?.sku === "string" && parsed.sku.trim()) {
      return parsed.sku.trim();
    }
  } catch {
    // plain SKU fallback
  }

  if (/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) {
    return value;
  }

  return null;
}

const auditFields = {
  source: z.enum(["QR", "MANUAL"]).optional().nullable(),
};

export const movementActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("STOCK_IN"),
    sku: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
    note: z.string().trim().max(500).optional().nullable(),
    actor: z.string().trim().max(120).optional().nullable(),
    ...auditFields,
  }),
  z.object({
    type: z.literal("STOCK_OUT"),
    sku: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
    note: z.string().trim().max(500).optional().nullable(),
    actor: z.string().trim().max(120).optional().nullable(),
    ...auditFields,
  }),
  z.object({
    type: z.literal("BORROW"),
    sku: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
    borrower: z.string().trim().min(1).max(120),
    note: z.string().trim().max(500).optional().nullable(),
    dueAt: z.string().trim().optional().nullable(),
    ...auditFields,
  }),
  z.object({
    type: z.literal("RETURN"),
    borrowId: z.string().trim().min(1),
    note: z.string().trim().max(500).optional().nullable(),
    ...auditFields,
  }),
]);

export type MovementActionInput = z.infer<typeof movementActionSchema>;

export function movementLabel(type: MovementType) {
  switch (type) {
    case "STOCK_IN":
      return "Stock in";
    case "STOCK_OUT":
      return "Stock out";
    case "BORROW":
      return "Borrow";
    case "RETURN":
      return "Return";
  }
}
