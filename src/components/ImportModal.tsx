"use client";

import { FormEvent, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: string[];
};

export function ImportModal({ open, onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upsert" | "skip">("upsert");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a CSV, XLS, or XLSX file");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("mode", mode);

      const response = await fetch("/api/stocks/import", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      setResult(data as ImportResult);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="import-title">Import stock</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="import-form" onSubmit={handleSubmit}>
          <p className="muted">
            Upload CSV, XLS, or XLSX. Expected columns: SKU, Name, Description,
            Quantity, Unit Price, Category, Location, Reorder Level.
          </p>

          <label>
            File
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            />
          </label>

          <fieldset>
            <legend>When SKU already exists</legend>
            <label className="radio-row">
              <input
                type="radio"
                name="mode"
                checked={mode === "upsert"}
                onChange={() => setMode("upsert")}
              />
              Update existing row
            </label>
            <label className="radio-row">
              <input
                type="radio"
                name="mode"
                checked={mode === "skip"}
                onChange={() => setMode("skip")}
              />
              Skip duplicate SKUs
            </label>
          </fieldset>

          {error ? <p className="form-error">{error}</p> : null}

          {result ? (
            <div className="import-result">
              <p>
                Imported {result.total} rows — {result.created} created,{" "}
                {result.updated} updated, {result.skipped} skipped.
              </p>
              {result.errors.length > 0 ? (
                <ul>
                  {result.errors.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="form-actions">
            <a className="ghost-btn" href="/samples/stock-template.csv" download>
              Download template
            </a>
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? "Importing…" : "Import file"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
