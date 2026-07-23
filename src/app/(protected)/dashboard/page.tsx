import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/auth/LogoutButton";
import Container from "@/components/ui/Container";

export default async function DashboardPage() {
  const user = await getCurrentUser();

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

        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-lg font-semibold text-slate-950">No receipts yet.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Upload your first receipt.</p>
        </div>
      </div>
    </Container>
  );
}
