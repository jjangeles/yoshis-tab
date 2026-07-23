"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import Container from "@/components/ui/Container";

export default function NewReceiptPage() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  const [discount, setDiscount] = useState("");
  const [total, setTotal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserSupabase();
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data?.session;

    if (sessionResult.error || !session?.user) {
      setError("Unable to verify current user.");
      setLoading(false);
      return;
    }

    const parsedSubtotal = Number(subtotal || 0);
    const parsedTax = Number(tax || 0);
    const parsedServiceCharge = Number(serviceCharge || 0);
    const parsedDiscount = Number(discount || 0);
    const parsedTotal = Number(total || 0);

    const receiptPayload = {
      owner_id: session.user.id,
      merchant_name: merchantName || null,
      receipt_date: receiptDate || null,
      subtotal: parsedSubtotal,
      tax: parsedTax,
      service_charge: parsedServiceCharge,
      discount: parsedDiscount,
      total: parsedTotal,
      currency: "PHP",
      image_url: null,
    };

    const insertResult = await supabase
      .from("receipts")
      .insert([receiptPayload] as any)
      .select("id");

    setLoading(false);

    if (insertResult.error) {
      setError(insertResult.error.message || "Failed to create receipt.");
      return;
    }

    const insertedData = insertResult.data as Array<{ id: string }> | null;

    if (!insertedData || !insertedData[0]?.id) {
      setError("Receipt was created but could not read its ID.");
      return;
    }

    router.push(`/receipts/${insertedData[0].id}`);
  };

  return (
    <Container>
      <div className="mx-auto max-w-3xl py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-950">Create Receipt</h1>
          <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Merchant name</label>
              <input
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Receipt date</label>
              <input
                type="date"
                value={receiptDate}
                onChange={(event) => setReceiptDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Subtotal</label>
                <input
                  type="number"
                  step="0.01"
                  value={subtotal}
                  onChange={(event) => setSubtotal(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tax</label>
                <input
                  type="number"
                  step="0.01"
                  value={tax}
                  onChange={(event) => setTax(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Service charge</label>
                <input
                  type="number"
                  step="0.01"
                  value={serviceCharge}
                  onChange={(event) => setServiceCharge(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Discount</label>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Total</label>
              <input
                type="number"
                step="0.01"
                value={total}
                onChange={(event) => setTotal(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
            </div>
            {error ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating receipt..." : "Create Receipt"}
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}
