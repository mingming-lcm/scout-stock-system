"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { encodeStockQr } from "@/lib/qr";
import { StockItem } from "@/types/stock";

type Props = {
  open: boolean;
  item: StockItem | null;
  onClose: () => void;
};

export function QrLabelModal({ open, item, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) {
      setDataUrl(null);
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(encodeStockQr(item.sku), {
      width: 280,
      margin: 2,
      color: { dark: "#14231c", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [open, item]);

  if (!open || !item) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel qr-label-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-label-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="qr-label-title">Item QR label</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="qr-label-body">
          <p className="mono">{item.sku}</p>
          <strong>{item.name}</strong>
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`QR code for ${item.sku}`} />
          ) : (
            <p className="muted">Generating QR…</p>
          )}
          <p className="muted">
            Payload: <span className="mono">{encodeStockQr(item.sku)}</span>
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => window.print()}
            >
              Print
            </button>
            {dataUrl ? (
              <a className="primary-btn" href={dataUrl} download={`${item.sku}-qr.png`}>
                Download PNG
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
