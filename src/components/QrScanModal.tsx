"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeStockQr, movementLabel, MovementType } from "@/lib/qr";
import { StockBorrow, StockItem } from "@/types/stock";

type LookupItem = StockItem & { borrows: StockBorrow[] };

type Props = {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
};

const ACTIONS: MovementType[] = ["STOCK_IN", "STOCK_OUT", "BORROW", "RETURN"];

export function QrScanModal({ open, onClose, onCompleted }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerBusy = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [item, setItem] = useState<LookupItem | null>(null);
  const [action, setAction] = useState<MovementType>("STOCK_IN");
  const [quantity, setQuantity] = useState(1);
  const [actor, setActor] = useState("");
  const [borrower, setBorrower] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [borrowId, setBorrowId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // camera may already be stopped
    }
    setScanning(false);
  }, []);

  const lookupCode = useCallback(async (raw: string) => {
    const sku = decodeStockQr(raw);
    if (!sku) {
      setError("Could not read a valid SKU from that code");
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch(
      `/api/stocks/lookup?code=${encodeURIComponent(raw)}`,
    );
    const data = await response.json();
    if (!response.ok) {
      setItem(null);
      setError(data.error ?? "Item not found");
      return;
    }

    const found = data.item as LookupItem;
    setItem(found);
    setQuantity(1);
    setBorrowId(found.borrows[0]?.id ?? "");
    setAction(found.borrows.length > 0 ? "RETURN" : "STOCK_IN");
    await stopScanner();
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    if (scannerBusy.current) return;
    scannerBusy.current = true;
    setError(null);
    setSuccess(null);

    try {
      await stopScanner();
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void lookupCode(decoded);
        },
        () => undefined,
      );
    } catch {
      setScanning(false);
      setError(
        "Camera unavailable. Allow camera access or enter the SKU manually.",
      );
    } finally {
      scannerBusy.current = false;
    }
  }, [lookupCode, stopScanner]);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setItem(null);
      setManualCode("");
      setError(null);
      setSuccess(null);
      setActor("");
      setBorrower("");
      setDueAt("");
      setNote("");
      return;
    }

    void startScanner();
    return () => {
      void stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  if (!open) return null;

  async function handleManualLookup(event: FormEvent) {
    event.preventDefault();
    await lookupCode(manualCode);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!item) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let body: Record<string, unknown>;

      if (action === "RETURN") {
        if (!borrowId) {
          throw new Error("Select an active borrow to return");
        }
        body = { type: "RETURN", borrowId, note: note || null, source: "QR" };
      } else if (action === "BORROW") {
        body = {
          type: "BORROW",
          sku: item.sku,
          quantity,
          borrower,
          note: note || null,
          dueAt: dueAt || null,
          source: "QR",
        };
      } else {
        body = {
          type: action,
          sku: item.sku,
          quantity,
          note: note || null,
          actor: actor || null,
          source: "QR",
        };
      }

      const response = await fetch("/api/stocks/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Action failed");
      }

      const nextQty = data.item?.quantity;
      setSuccess(
        `${movementLabel(action)} recorded. On hand now: ${nextQty}`,
      );
      onCompleted();

      const refreshed = await fetch(
        `/api/stocks/lookup?sku=${encodeURIComponent(item.sku)}`,
      );
      if (refreshed.ok) {
        const payload = await refreshed.json();
        setItem(payload.item as LookupItem);
        setBorrowId(payload.item.borrows[0]?.id ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel scan-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="scan-title">Scan QR</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="scan-layout">
          <div className="scan-camera">
            <div id="qr-reader" className="qr-reader" />
            <div className="form-actions">
              {scanning ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => void stopScanner()}
                >
                  Pause camera
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => void startScanner()}
                >
                  Start camera
                </button>
              )}
            </div>

            <form className="manual-lookup" onSubmit={handleManualLookup}>
              <label>
                Or enter SKU / QR payload
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="SCOUT:SKU-1001"
                />
              </label>
              <button type="submit" className="ghost-btn">
                Look up
              </button>
            </form>
          </div>

          <div className="scan-action">
            {item ? (
              <>
                <div className="scan-item-card">
                  <p className="mono">{item.sku}</p>
                  <strong>{item.name}</strong>
                  <p className="muted">On hand: {item.quantity}</p>
                  {item.borrows.length > 0 ? (
                    <p className="muted">
                      Active borrows: {item.borrows.length}
                    </p>
                  ) : null}
                </div>

                <form className="stock-form" onSubmit={handleSubmit}>
                  <label className="full">
                    Action
                    <select
                      value={action}
                      onChange={(e) =>
                        setAction(e.target.value as MovementType)
                      }
                    >
                      {ACTIONS.map((entry) => (
                        <option
                          key={entry}
                          value={entry}
                          disabled={
                            entry === "RETURN" && item.borrows.length === 0
                          }
                        >
                          {movementLabel(entry)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {action !== "RETURN" ? (
                    <label>
                      Quantity
                      <input
                        type="number"
                        min={1}
                        step={1}
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                    </label>
                  ) : (
                    <label className="full">
                      Active borrow
                      <select
                        required
                        value={borrowId}
                        onChange={(e) => setBorrowId(e.target.value)}
                      >
                        <option value="" disabled>
                          Select borrow
                        </option>
                        {item.borrows.map((borrow) => (
                          <option key={borrow.id} value={borrow.id}>
                            {borrow.borrower} · qty {borrow.quantity}
                            {borrow.dueAt
                              ? ` · due ${new Date(borrow.dueAt).toLocaleDateString()}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {action === "BORROW" ? (
                    <>
                      <label>
                        Borrower
                        <input
                          required
                          value={borrower}
                          onChange={(e) => setBorrower(e.target.value)}
                          placeholder="Name"
                        />
                      </label>
                      <label>
                        Due date
                        <input
                          type="date"
                          value={dueAt}
                          onChange={(e) => setDueAt(e.target.value)}
                        />
                      </label>
                    </>
                  ) : null}

                  {action === "STOCK_IN" || action === "STOCK_OUT" ? (
                    <label>
                      By
                      <input
                        value={actor}
                        onChange={(e) => setActor(e.target.value)}
                        placeholder="Operator"
                      />
                    </label>
                  ) : null}

                  <label className="full">
                    Note
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional"
                    />
                  </label>

                  {error ? <p className="form-error full">{error}</p> : null}
                  {success ? <p className="form-success full">{success}</p> : null}

                  <div className="form-actions full">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setItem(null);
                        setSuccess(null);
                        void startScanner();
                      }}
                    >
                      Scan another
                    </button>
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : `Confirm ${movementLabel(action)}`}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="empty-state scan-empty">
                <h2>Aim at an item QR</h2>
                <p>
                  Codes are formatted as <span className="mono">SCOUT:SKU</span>.
                  After a match, choose stock in, stock out, borrow, or return.
                </p>
                {error ? <p className="form-error">{error}</p> : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
