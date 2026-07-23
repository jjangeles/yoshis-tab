import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import Container from "@/components/ui/Container";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Container>
      <div className="py-16">
        <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950">Dashboard</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Welcome back, {session.user.email}.
              </p>
            </div>
            <LogoutButton />
          </div>
          <p className="text-base leading-7 text-slate-600">
            Access your receipts, upload new ones, and manage participants once
            your email is authenticated.
          </p>
        </div>
      </div>
    </Container>
  );
}
