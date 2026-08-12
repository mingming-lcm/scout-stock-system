# Scout Stocks

Stock inventory system with CSV / Excel import and export.

## Features

- Add, edit, delete, and search stock items
- Filter by category
- Low-stock highlighting (quantity at or below reorder level)
- Import from `.csv`, `.xls`, or `.xlsx`
- Export to CSV, XLSX, or XLS
- Downloadable import template at `/samples/stock-template.csv`

## Stack

- Next.js (App Router)
- Prisma 7 + SQLite
- Papa Parse + SheetJS (`xlsx`) for file conversion

## Setup

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
