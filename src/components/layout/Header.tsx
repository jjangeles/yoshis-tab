"use client";

import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-none border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
        <Link
          key='home'
          href="/dashboard"
        >
          <p className="mt-1 text-base text-lg font-semibold text-slate-950 dark:text-slate-50">
            Yoshi's Tab
          </p>
          <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Bill sharing made easy
          </p>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/receipts/new" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200">
            New
          </Link>
          {/* <ThemeToggle /> */}
        </div>
      </div>
    </header>
  );
}
