"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportModal } from "@/components/ImportModal";
import { StockFormModal } from "@/components/StockFormModal";
import { StockItem } from "@/types/stock";

type ListResponse = {
  items: StockItem[];
  categories: string[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function StockInventory() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);

      const response = await fetch(`/api/stocks?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load stock");
      const data = (await response.json()) as ListResponse;
      setItems(data.items);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock");
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totals = useMemo(() => {
    const units = items.reduce((sum, item) => sum + item.quantity, 0);
    const value = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const low = items.filter((item) => item.quantity <= item.reorderLevel).length;
    return { units, value, low, skus: items.length };
  }, [items]);

  async function handleDelete(item: StockItem) {
    const ok = window.confirm(`Delete ${item.sku} — ${item.name}?`);
    if (!ok) return;

    const response = await fetch(`/api/stocks/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Delete failed");
      return;
    }
    void load();
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: StockItem) {
    setEditing(item);
    setFormOpen(true);
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="brand">Scout Stocks</p>
          <h1>Inventory</h1>
        </div>
        <div className="toolbar">
          <button type="button" className="primary-btn" onClick={openCreate}>
            Add item
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setImportOpen(true)}
          >
            Import
          </button>
          <div className="export-wrap">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setExportOpen((open) => !open)}
            >
              Export
            </button>
            {exportOpen ? (
              <div className="export-menu">
                <a href="/api/stocks/export?format=csv">CSV</a>
                <a href="/api/stocks/export?format=xlsx">XLSX</a>
                <a href="/api/stocks/export?format=xls">XLS</a>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="stats-row" aria-label="Inventory summary">
        <div>
          <span>SKUs</span>
          <strong>{totals.skus}</strong>
        </div>
        <div>
          <span>Units on hand</span>
          <strong>{totals.units}</strong>
        </div>
        <div>
          <span>Stock value</span>
          <strong>{formatMoney(totals.value)}</strong>
        </div>
        <div>
          <span>At / below reorder</span>
          <strong className={totals.low > 0 ? "warn" : undefined}>
            {totals.low}
          </strong>
        </div>
      </section>

      <section className="filters">
        <label className="search-field">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SKU, name, location…"
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-btn" onClick={() => void load()}>
          Refresh
        </button>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="table-panel">
        {loading ? <p className="muted">Loading inventory…</p> : null}
        {!loading && items.length === 0 ? (
          <div className="empty-state">
            <h2>No stock yet</h2>
            <p>Add an item manually or import a CSV / Excel file.</p>
            <div className="toolbar">
              <button type="button" className="primary-btn" onClick={openCreate}>
                Add item
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setImportOpen(true)}
              >
                Import file
              </button>
            </div>
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Value</th>
                  <th>Reorder</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const low = item.quantity <= item.reorderLevel;
                  return (
                    <tr key={item.id} className={low ? "low-stock" : undefined}>
                      <td className="mono">{item.sku}</td>
                      <td>
                        <div className="name-cell">
                          <strong>{item.name}</strong>
                          {item.description ? (
                            <span>{item.description}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{item.category ?? "—"}</td>
                      <td>{item.location ?? "—"}</td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.unitPrice)}</td>
                      <td>{formatMoney(item.quantity * item.unitPrice)}</td>
                      <td>{item.reorderLevel}</td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => void handleDelete(item)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <StockFormModal
        open={formOpen}
        item={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => void load()}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void load()}
      />
    </div>
  );
}
