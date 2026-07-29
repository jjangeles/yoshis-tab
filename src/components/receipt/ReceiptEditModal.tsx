"use client";

import { useEffect, useState } from "react";
import { X, Pencil, Ellipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

interface ReceiptEditModalProps {
  receipt: {
    id: string;
    merchant_name: string | null;
    receipt_date: string | null;
    subtotal: number| null;
    tax: number | null;
    service_charge: number | null;
    total: number;
  };
}

export default function ReceiptEditModal({
  receipt,
}: ReceiptEditModalProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [merchantName, setMerchantName] = useState(receipt.merchant_name ?? "");
  const [receiptDate, setReceiptDate] = useState(
    receipt.receipt_date?.split("T")[0] ?? ""
  );
  const [subtotal, setSubtotal] = useState(receipt.subtotal?.toString() ?? "0");
  const [tax, setTax] = useState(receipt.tax?.toString() ?? "0");
  const [serviceCharge, setServiceCharge] = useState(
    receipt.service_charge?.toString() ?? "0"
  );
  const [total, setTotal] = useState(receipt.total.toString());

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    const supabase = createBrowserSupabase();

    type Debug = Database["public"]["Tables"]["receipts"];
    type ClientDebug = typeof supabase;

    const test = supabase.from("receipts");

    const { error } = await supabase
      .from("receipts")
      .update({
        merchant_name: merchantName.trim() || null,
        receipt_date: receiptDate || null,
        subtotal: Number(subtotal) || 0,
        tax: Number(tax) || 0,
        service_charge: Number(serviceCharge) || 0,
        total: Number(total) || 0,
      })
      .eq("id", receipt.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute right-0 top-0 flex items-center gap-2 px-2 rounded-3xl text-xs font-semibold dark:text-white text-slate-950 dark:border-white border-slate-950"
      >
        <Ellipsis size={30} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-5 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-5 rounded-[2rem] bg-white p-6 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold dark:text-white">Edit Receipt</h2>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <X />
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-red-100 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Merchant Name */}
            <div className="space-y-1.5">
              <label htmlFor="merchantName" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Merchant Name
              </label>
              <input
                id="merchantName"
                className="w-full rounded-2xl border px-4 py-3 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                placeholder="e.g. Starbucks"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>

            {/* Receipt Date */}
            <div className="space-y-1.5">
              <label htmlFor="receiptDate" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Receipt Date
              </label>
              <input
                id="receiptDate"
                type="date"
                className="w-full rounded-2xl border px-4 py-3 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </div>

            {/* Subtotal */}
            <div className="space-y-1.5">
              <label htmlFor="subtotal" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Subtotal
              </label>
              <input
                id="subtotal"
                type="number"
                step="0.01"
                className="w-full rounded-2xl border px-4 py-3 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                placeholder="0.00"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
              />
            </div>

            {/* Tax */}
            <div className="space-y-1.5">
              <label htmlFor="tax" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Tax
              </label>
              <input
                id="tax"
                type="number"
                step="0.01"
                className="w-full rounded-2xl border px-4 py-3 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                placeholder="0.00"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </div>

            {/* Service Charge */}
            <div className="space-y-1.5">
              <label htmlFor="serviceCharge" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Service Charge
              </label>
              <input
                id="serviceCharge"
                type="number"
                step="0.01"
                className="w-full rounded-2xl border px-4 py-3 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                placeholder="0.00"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
              />
            </div>

            {/* Total */}
            <div className="space-y-1.5">
              <label htmlFor="total" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Total
              </label>
              <input
                id="total"
                type="number"
                step="0.01"
                className="w-full rounded-2xl border px-4 py-3 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                placeholder="0.00"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>

            <button
              disabled={saving}
              className="w-full rounded-3xl bg-slate-950 py-3 font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}