"use client";

import { FormEvent, useEffect, useState } from "react";
import { StockFormValues, emptyStockForm, StockItem } from "@/types/stock";

type Props = {
  open: boolean;
  item?: StockItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function StockFormModal({ open, item, onClose, onSaved }: Props) {
  const [form, setForm] = useState<StockFormValues>(emptyStockForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (item) {
      setForm({
        sku: item.sku,
        name: item.name,
        description: item.description ?? "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        category: item.category ?? "",
        location: item.location ?? "",
        reorderLevel: item.reorderLevel,
      });
    } else {
      setForm(emptyStockForm);
    }
  }, [open, item]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(item ? `/api/stocks/${item.id}` : "/api/stocks", {
        method: item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save item");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="stock-form-title">{item ? "Edit stock item" : "Add stock item"}</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="stock-form" onSubmit={handleSubmit}>
          <label>
            SKU
            <input
              required
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              placeholder="SKU-001"
            />
          </label>
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Widget housing"
            />
          </label>
          <label className="full">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional notes"
            />
          </label>
          <label>
            Quantity
            <input
              required
              type="number"
              min={0}
              step={1}
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            Unit price
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.unitPrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            Category
            <input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="Hardware"
            />
          </label>
          <label>
            Location
            <input
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="Aisle B / Bin 12"
            />
          </label>
          <label>
            Reorder level
            <input
              type="number"
              min={0}
              step={1}
              value={form.reorderLevel}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  reorderLevel: Number(e.target.value),
                }))
              }
            />
          </label>

          {error ? <p className="form-error full">{error}</p> : null}

          <div className="form-actions full">
            <button type="button" className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Saving…" : item ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
