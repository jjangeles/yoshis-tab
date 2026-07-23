export default function ReceiptOverview() {
  return (
    <section className="rounded-[2rem] bg-white/95 p-5 shadow-sm shadow-slate-900/5 dark:bg-slate-900/95 dark:shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Receipt overview</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Preview receipt totals and participant assignments.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Live
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Merchant</p>
          <p className="mt-2 text-base font-semibold text-slate-950 dark:text-slate-50">TBD</p>
        </div>
        <div className="rounded-3xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total</p>
          <p className="mt-2 text-base font-semibold text-slate-950 dark:text-slate-50">PHP 0.00</p>
        </div>
      </div>
    </section>
  );
}
