export type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number | null;
  created_at: string;
};

export type LineItem = {
  sku: string;
  name: string;
  price: number;
  qty: number;
};

export type PaymentMethod = 'Cash' | 'Zelle' | 'Apple Pay' | 'Cash App' | 'Other';

export type Transaction = {
  id: string;
  created_at: string;
  payment_method: PaymentMethod;
  items: LineItem[];
  total: number;
  voided: boolean;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  transaction_id: string | null;
  customer_name: string | null;
  customer_contact: string | null;
  items: LineItem[];
  subtotal: number;
  shipping: number;
  total: number;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
};
