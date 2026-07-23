export type ReceiptCurrency = "PHP" | "USD" | "EUR" | string;

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  owner_id: string;
  merchant_name: string;
  receipt_date: string | null;
  subtotal: number;
  tax: number;
  service_charge: number;
  discount: number;
  total: number;
  currency: ReceiptCurrency;
  image_url: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  receipt_id: string;
  user_id: string | null;
  name: string;
  created_at: string;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface ItemAssignment {
  id: string;
  receipt_item_id: string;
  participant_id: string;
  quantity: number;
  created_at: string;
}

export interface ReceiptAdjustment {
  id: string;
  receipt_id: string;
  type: string;
  amount: number;
  distribution_method: string;
  created_at: string;
}

export interface AdjustmentAllocation {
  id: string;
  adjustment_id: string;
  participant_id: string;
  amount: number;
  created_at: string;
}
