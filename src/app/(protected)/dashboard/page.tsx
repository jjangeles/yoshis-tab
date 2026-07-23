import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";
import Container from "@/components/ui/Container";
import type { Database } from "@/types/database";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  console.log("Dashboard current user id:", user.id);

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  console.log("Dashboard receipts query result:", receipts);
  console.log("Dashboard receipts query error:", error);

  return (
    <Container>
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">Split Receipt</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Logged in as {user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/receipts/new"
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Create Receipt
            </Link>
            <LogoutButton />
          </div>
        </div>

        {receipts && receipts.length > 0 ? (
          <div className="mt-10 grid gap-4">
            {receipts.map((receipt: Database["public"]["Tables"]["receipts"]["Row"]) => (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:border-slate-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{receipt.merchant_name || "Untitled Receipt"}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString() : "No date"}
                    </p>
                  </div>
                  <p className="text-xl font-semibold text-slate-950">{receipt.total.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="text-lg font-semibold text-slate-950">No receipts yet.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Upload your first receipt.</p>
          </div>
        )}
      </div>
    </Container>
  );
}
