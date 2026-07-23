import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto flex max-w-xl flex-col justify-center gap-8">
        <section className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Receipt splitting
          </p>
          <h1 className="text-4xl font-semibold">Stay on top of every bill</h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-400">
            Upload receipts, extract items, and split expenses with a minimalist mobile-friendly experience.
          </p>
        </section>

        <div className="grid gap-4">
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-3xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="flex h-12 items-center justify-center rounded-3xl border border-slate-200 bg-white text-sm font-semibold text-slate-950 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
          >
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
