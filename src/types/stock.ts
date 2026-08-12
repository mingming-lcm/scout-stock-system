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
