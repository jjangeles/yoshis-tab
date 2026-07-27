import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import ReceiptImageViewer from "@/components/receipt/ReceiptImageViewer";

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

  if (error || !data) {
    return notFound();
  }

  const receipt = data as ReceiptWithItems;
  let imageUrl = null

  if (receipt.image_url) {
    const { data: imageData } = await supabase.storage
      .from("receipt-images")
      .createSignedUrl(receipt.image_url, 60 * 60);
  
    imageUrl = imageData?.signedUrl;
    console.log(receipt.image_url);
  }

  if (receipt.owner_id !== user.id) {
    return notFound();
  }

  return (
    <div className="space-y-6 pb-10 pt-4">
      <section className="space-y-4">
        <div className="rounded-[2rem] px-5 py-5 bg-white/95 shadow-sm shadow-slate-900/5 dark:bg-slate-900/95 dark:shadow-none">
          <div className="flex flex-col gap-3">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
                {receipt.merchant_name || "Untitled Receipt"}
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {
                  receipt.receipt_date
                    ? new Date(receipt.receipt_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Date Unavailable"
                }
              </p>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {receipt.subtotal !== 0 && (
                <div className="flex justify-between items-center gap-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Subtotal</p>
                  <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{receipt.subtotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</p>
              </div>)}
              {receipt.tax !== 0 && (
              <div className="flex justify-between items-center gap-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Tax</p>
                <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{receipt.tax.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</p>
              </div>)}
              {receipt.service_charge !== 0 && (
              <div className="flex justify-between items-center gap-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Service charge</p>
                <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{receipt.service_charge.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</p>
              </div>)}
              {receipt.discount !== 0 && (
              <div className="flex justify-between items-center gap-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Discount</p>
                <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{receipt.discount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</p>
              </div>)}
            </div>
            <div className="text-center rounded-[1rem] bg-slate-950 p-2 text-white dark:bg-slate-50 dark:text-slate-950">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-500">Total</p>
              <p className="mt-1 text-3xl font-semibold">
                ₱ {receipt.total.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] px-2 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-md font-semibold text-slate-950 dark:text-slate-50">Receipt items</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Items  read from this receipt.
              </p>
            </div>
            {receipt.image_url && (
              <ReceiptImageViewer imageUrl={imageUrl} />
            )}
          </div>

          {Array.isArray(receipt.receipt_items) && receipt.receipt_items.length > 0 ? (
            <div className="mt-4 space-y-3">
              {receipt.receipt_items.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] px-4 py-4 bg-white/95 shadow-sm shadow-slate-900/5 dark:bg-slate-900/95 dark:shadow-none">
                  <div className="flex items-center gap-2 sm:flex-row sm:items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-950 dark:text-slate-50">{item.name || "Unnamed item"}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Qty {item.quantity} • {item.unit_price.toFixed(2)} each
                      </p>
                    </div>
                    <p className="text-xl text-base text-slate-950 dark:text-slate-50">{item.total_price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.5rem] bg-slate-100 px-4 py-5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              No receipt items were returned for this receipt.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
