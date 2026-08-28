# Scout Stocks

Stock inventory system with CSV / Excel import and export, plus QR scan for stock movements.

## Features

- Add, edit, delete, and search stock items
- Filter by category
- Low-stock highlighting (quantity at or below reorder level)
- Import from `.csv`, `.xls`, or `.xlsx`
- Export to CSV, XLSX, or XLS
- Downloadable import template at `/samples/stock-template.csv`
- Generate / print item QR labels (`SCOUT:{SKU}`)
- Camera QR scan for **stock in**, **stock out**, **borrow**, and **return**
- Active borrows list with one-click return

## Stack

- Next.js (App Router)
- Prisma 7 + SQLite
- Papa Parse + SheetJS (`xlsx`) for file conversion
- `qrcode` + `html5-qrcode` for labels and scanning

## Setup

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Camera scanning needs HTTPS or `localhost`, plus browser camera permission.

## QR workflow

1. Open an item row → **QR** → print or download the label.
2. Click **Scan QR**, point the camera at the label (or enter `SCOUT:SKU` / plain SKU).
3. Choose action:
   - **Stock in** — increases on-hand quantity
   - **Stock out** — decreases on-hand quantity
   - **Borrow** — decreases quantity and creates an active borrow
   - **Return** — restores quantity and closes the borrow

## Import columns

| Column | Required | Notes |
| --- | --- | --- |
| SKU | Yes | Unique key used for upserts |
| Name | Yes | |
| Description | No | |
| Quantity | No | Defaults to `0` |
| Unit Price | No | Defaults to `0` |
| Category | No | |
| Location | No | |
| Reorder Level | No | Defaults to `0` |

Duplicate SKUs can be updated or skipped during import.
