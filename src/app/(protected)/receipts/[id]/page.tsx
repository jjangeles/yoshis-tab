import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import Container from "@/components/ui/Container";
import ReceiptParseClient from "./ReceiptParseClient";

interface ReceiptPageProps {
  params: Promise<{
    id: string;
  }>;
}

type ReceiptWithItems = Database["public"]["Tables"]["receipts"]["Row"] & {
  receipt_items: Database["public"]["Tables"]["receipt_items"]["Row"][];
};

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("receipts")
    .select(`*, receipt_items (*)`)
    .eq("id", id)
    .single() as { data: ReceiptWithItems | null; error: unknown };

  console.log("Receipt detail data:", data);
  console.log("Receipt detail receipt_items:", data?.receipt_items);

  if (error || !data) {
    return notFound();
  }

  const receipt = data as ReceiptWithItems;

  if (receipt.owner_id !== user.id) {
    return notFound();
  }

  return (
    <Container>
      <div className="mx-auto max-w-3xl py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <ReceiptParseClient receiptId={receipt.id} />

          <div className="mt-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold text-slate-950">
                {receipt.merchant_name || "Untitled Receipt"}
              </h1>
              <p className="text-sm leading-6 text-slate-600">
                Receipt date: {receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString() : "N/A"}
              </p>
              <p className="text-sm leading-6 text-slate-600">Created at: {new Date(receipt.created_at).toLocaleDateString()}</p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Subtotal</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{receipt.subtotal.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Tax</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{receipt.tax.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Service charge</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{receipt.service_charge.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Discount</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{receipt.discount.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-10 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Total</p>
              <p className="mt-2 text-3xl font-semibold">{receipt.total.toFixed(2)}</p>
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Receipt items</h2>

              {Array.isArray(receipt.receipt_items) && receipt.receipt_items.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {receipt.receipt_items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-950">{item.name || "Unnamed item"}</p>
                          <p className="text-sm leading-6 text-slate-600">
                            Quantity: {item.quantity} • Unit price: {item.unit_price.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-sm font-semibold text-slate-950">Total: {item.total_price.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  No receipt items were returned for this receipt.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
