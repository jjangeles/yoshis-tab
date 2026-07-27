"use client";

import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { Home, Plus, Users } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/" />

        <div className="relative flex w-full items-center gap-3 justify-center">
          <Link
            href="/"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Home className="h-5 w-10" />
          </Link>
          <Link
            href="/receipts/new"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus className="h-5 w-10" />
          </Link>
          <Link
            href="/participants"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Users className="h-5 w-10" />
          </Link>

          <div className="absolute right-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}