export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  owner_id: string;
  merchant_name: string | null;
  receipt_date: string | null;
  subtotal: number;
  tax: number;
  service_charge: number;
  discount: number;
  total: number;
  currency: string;
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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      receipts: {
        Row: Receipt;
        Insert: Omit<Receipt, "id" | "created_at" | "image_url"> & {
          id?: string;
          created_at?: string;
          image_url?: string | null;
        };
        Update: Partial<Receipt>;
        Relationships: [];
      };
      participants: {
        Row: Participant;
        Insert: Omit<Participant, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Participant>;
        Relationships: [];
      };
      receipt_items: {
        Row: ReceiptItem;
        Insert: Omit<ReceiptItem, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ReceiptItem>;
        Relationships: [];
      };
      item_assignments: {
        Row: ItemAssignment;
        Insert: Omit<ItemAssignment, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ItemAssignment>;
        Relationships: [];
      };
      receipt_adjustments: {
        Row: ReceiptAdjustment;
        Insert: Omit<ReceiptAdjustment, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ReceiptAdjustment>;
        Relationships: [];
      };
      adjustment_allocations: {
        Row: AdjustmentAllocation;
        Insert: Omit<AdjustmentAllocation, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<AdjustmentAllocation>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};
