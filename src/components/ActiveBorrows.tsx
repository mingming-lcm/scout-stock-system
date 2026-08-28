"use client";

import { useCallback, useEffect, useState } from "react";
import { StockBorrow } from "@/types/stock";

type BorrowRow = StockBorrow & {
  item: { id: string; sku: string; name: string; quantity: number };
};

type Props = {
  refreshKey: number;
  onChanged: () => void;
};

export function ActiveBorrows({ refreshKey, onChanged }: Props) {
  const [borrows, setBorrows] = useState<BorrowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stocks/movements?status=ACTIVE&limit=100");
      if (!response.ok) throw new Error("Failed to load borrows");
      const data = await response.json();
      setBorrows(data.borrows as BorrowRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load borrows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleReturn(borrow: BorrowRow) {
    setReturningId(borrow.id);
    setError(null);
    try {
      const response = await fetch("/api/stocks/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "RETURN", borrowId: borrow.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Return failed");
      }
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return failed");
    } finally {
      setReturningId(null);
    }
  }

  return (
    <section className="table-panel borrows-panel">
      <div className="section-heading">
        <h2>Active borrows</h2>
        <button type="button" className="ghost-btn" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted">Loading borrows…</p> : null}

      {!loading && borrows.length === 0 ? (
        <p className="muted">No active borrows.</p>
      ) : null}

      {!loading && borrows.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th>Borrower</th>
                <th>Qty</th>
                <th>Borrowed</th>
                <th>Due</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {borrows.map((borrow) => (
                <tr key={borrow.id}>
                  <td className="mono">{borrow.item.sku}</td>
                  <td>{borrow.item.name}</td>
                  <td>{borrow.borrower}</td>
                  <td>{borrow.quantity}</td>
                  <td>{new Date(borrow.borrowedAt).toLocaleString()}</td>
                  <td>
                    {borrow.dueAt
                      ? new Date(borrow.dueAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={returningId === borrow.id}
                      onClick={() => void handleReturn(borrow)}
                    >
                      {returningId === borrow.id ? "Returning…" : "Return"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
