import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import Container from "@/components/ui/Container";

interface ReceiptPageProps {
  params: {
    id: string;
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return notFound();
  }

  const receipt = data as Database["public"]["Tables"]["receipts"]["Row"];

  if (receipt.owner_id !== user.id) {
    return notFound();
  }

  return (
    <Container>
      <div className="mx-auto max-w-3xl py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-slate-950">
              {receipt.merchant_name || "Untitled Receipt"}
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              Receipt date: {receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString() : "N/A"}
            </p>
            <p className="text-sm leading-6 text-slate-600">
              Created at: {new Date(receipt.created_at).toLocaleDateString()}
            </p>
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
        </div>
      </div>
    </Container>
  );
}
