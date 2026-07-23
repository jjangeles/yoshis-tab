"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="text-lg font-semibold text-slate-950">
          Split Receipt
        </Link>
        <nav className="flex items-center gap-3 text-sm text-slate-700">
          <Link href="/dashboard" className="rounded-full px-4 py-2 hover:bg-slate-100">
            Dashboard
          </Link>
          <Link href="/upload" className="rounded-full px-4 py-2 hover:bg-slate-100">
            Upload
          </Link>
          <Link href="/login" className="rounded-full px-4 py-2 hover:bg-slate-100">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
