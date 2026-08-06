"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Home,
  Plus,
  Users,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";
import LogoutButton from "../auth/LogoutButton";

export default function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 pb-8">
        <Link href="/" />

        <div className="relative flex w-full items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-slate-950 px-4 py-2 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Home className="h-5 w-10" />
          </Link>

          <Link
            href="/receipts/new"
            className="rounded-full bg-slate-950 px-4 py-2 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus className="h-5 w-10" />
          </Link>

          <Link
            href="/participants"
            className="rounded-full bg-slate-950 px-4 py-2 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Users className="h-5 w-10" />
          </Link>

          <div className="absolute right-0" ref={menuRef}>
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="rounded-full p-2 transition hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <Settings className="h-5 w-5" />
            </button>

            {open && (
              <div className="absolute bottom-12 right-0 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-normal leading-5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm">Profile</span>
                </Link>

                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-normal leading-5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="h-4 w-4" />
                      <span className="text-sm">Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span className="text-sm">Dark Mode</span>
                    </>
                  )}
                </button>

                <div className="flex w-full items-center gap-3 px-4 py-3 text-sm font-normal leading-5 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                  <LogOut className="h-4 w-4 text-red-600 transition hover:bg-slate-100 dark:hover:bg-slate-800" />
                  <LogoutButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}