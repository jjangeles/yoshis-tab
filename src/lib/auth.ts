import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return user;
}
