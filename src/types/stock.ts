export type StockItem = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  category: string | null;
  location: string | null;
  reorderLevel: number;
  createdAt: string;
  updatedAt: string;
};

export type StockBorrow = {
  id: string;
  itemId: string;
  quantity: number;
  borrower: string;
  note: string | null;
  status: string;
  borrowedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
};

export type StockMovement = {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  note: string | null;
  actor: string | null;
  borrowId: string | null;
  createdAt: string;
};

export type StockFormValues = {
  sku: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
  location: string;
  reorderLevel: number;
};

export const emptyStockForm: StockFormValues = {
  sku: "",
  name: "",
  description: "",
  quantity: 0,
  unitPrice: 0,
  category: "",
  location: "",
  reorderLevel: 0,
};
