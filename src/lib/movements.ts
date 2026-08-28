import { prisma } from "@/lib/prisma";
import { emptyToNull } from "@/lib/stock";
import { MovementActionInput } from "@/lib/qr";

export async function applyStockAction(input: MovementActionInput) {
  return prisma.$transaction(async (tx) => {
    if (input.type === "RETURN") {
      const borrow = await tx.stockBorrow.findUnique({
        where: { id: input.borrowId },
        include: { item: true },
      });

      if (!borrow) {
        throw new ActionError("Borrow record not found", 404);
      }
      if (borrow.status !== "ACTIVE") {
        throw new ActionError("This borrow is already returned", 400);
      }

      const item = await tx.stockItem.update({
        where: { id: borrow.itemId },
        data: { quantity: { increment: borrow.quantity } },
      });

      const updatedBorrow = await tx.stockBorrow.update({
        where: { id: borrow.id },
        data: {
          status: "RETURNED",
          returnedAt: new Date(),
          note: emptyToNull(input.note) ?? borrow.note,
        },
        include: { item: true },
      });

      const movement = await tx.stockMovement.create({
        data: {
          itemId: borrow.itemId,
          type: "RETURN",
          quantity: borrow.quantity,
          note: emptyToNull(input.note),
          actor: borrow.borrower,
          borrowId: borrow.id,
        },
      });

      return { item, movement, borrow: updatedBorrow };
    }

    const item = await tx.stockItem.findUnique({ where: { sku: input.sku } });
    if (!item) {
      throw new ActionError(`SKU not found: ${input.sku}`, 404);
    }

    if (input.type === "STOCK_IN") {
      const updated = await tx.stockItem.update({
        where: { id: item.id },
        data: { quantity: { increment: input.quantity } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          itemId: item.id,
          type: "STOCK_IN",
          quantity: input.quantity,
          note: emptyToNull(input.note),
          actor: emptyToNull(input.actor),
        },
      });

      return { item: updated, movement, borrow: null };
    }

    if (input.type === "STOCK_OUT" || input.type === "BORROW") {
      if (item.quantity < input.quantity) {
        throw new ActionError(
          `Not enough stock. On hand: ${item.quantity}`,
          400,
        );
      }
    }

    if (input.type === "STOCK_OUT") {
      const updated = await tx.stockItem.update({
        where: { id: item.id },
        data: { quantity: { decrement: input.quantity } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          itemId: item.id,
          type: "STOCK_OUT",
          quantity: input.quantity,
          note: emptyToNull(input.note),
          actor: emptyToNull(input.actor),
        },
      });

      return { item: updated, movement, borrow: null };
    }

    // BORROW
    const dueAt =
      input.dueAt && input.dueAt.trim()
        ? new Date(input.dueAt)
        : null;

    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new ActionError("Invalid due date", 400);
    }

    const updated = await tx.stockItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: input.quantity } },
    });

    const borrow = await tx.stockBorrow.create({
      data: {
        itemId: item.id,
        quantity: input.quantity,
        borrower: input.borrower.trim(),
        note: emptyToNull(input.note),
        dueAt,
        status: "ACTIVE",
      },
      include: { item: true },
    });

    const movement = await tx.stockMovement.create({
      data: {
        itemId: item.id,
        type: "BORROW",
        quantity: input.quantity,
        note: emptyToNull(input.note),
        actor: input.borrower.trim(),
        borrowId: borrow.id,
      },
    });

    return { item: updated, movement, borrow };
  });
}

export class ActionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
