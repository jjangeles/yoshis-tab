"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserSupabase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    console.log("Login session:", data.session);

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto w-full max-w-md space-y-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold">Login</h1>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Sign in to manage receipts and split expenses naturally.
          </p>
        </section>

        <form onSubmit={handleLogin} className="space-y-4 rounded-[2rem] bg-white/95 p-6 shadow-sm shadow-slate-900/5 dark:bg-slate-900/95 dark:shadow-none">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
            />
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-700"
            />
          </div>
          {error ? (
            <p className="rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-3xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Don’t have an account? <a href="/register" className="font-semibold text-slate-950 dark:text-slate-50">Register</a>
        </p>
      </main>
    </div>
  );
}
