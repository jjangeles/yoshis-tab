"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import Image from "next/image";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const supabase = useMemo(() => createBrowserSupabase(), []);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

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
    <header
      className="
        fixed bottom-0 left-0 z-50 w-full border-t border-slate-200 bg-white/80 backdrop-blur
        dark:border-slate-800 dark:bg-slate-950/80

        md:top-0 md:bottom-auto md:border-t-0 md:border-b
      "
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
        <div className="relative flex w-full items-center justify-center gap-3 md:justify-end">
          {user ? (<>
            <div className="hidden md:block absolute left-0">
              <Image
                src={theme === "dark" ? "/bb-white.png" : "/bb-black.png"}
                alt="App logo"
                width={250}
                height={40}
                className="rounded-xl"
                priority
              />
            </div>

            <Link
              href="/"
              className="
                flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2
                text-white transition hover:bg-slate-800
                dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200
              "
            >
              <Home className="h-5 w-5" />
              <span className="hidden md:inline">Home</span>
            </Link>

            <Link
              href="/receipts/new"
              className="
                flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2
                text-white transition hover:bg-slate-800
                dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200
              "
            >
              <Plus className="h-5 w-5" />
              <span className="hidden md:inline">New Receipt</span>
            </Link>

            <Link
              href="/participants"
              className="
                flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2
                text-white transition hover:bg-slate-800
                dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200
              "
            >
              <Users className="h-5 w-5" />
              <span className="hidden md:inline">Participants</span>
            </Link>


            <div
              className="
                absolute right-0
                md:static
              "
              ref={menuRef}
            >
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="rounded-full p-2 transition hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <Settings className="h-5 w-5" />
              </button>

              {open && (
                <div
                  className="
                    absolute right-0 bottom-12
                    md:top-12 md:bottom-auto
                    w-52 overflow-hidden rounded-xl border border-slate-200
                    bg-white shadow-xl
                    dark:border-slate-700 dark:bg-slate-900
                  "
                >
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
          </>) : (<div className="flex w-full items-center justify-end gap-3">
            <div className="hidden md:block absolute left-0">
              <Image
                src={theme === "dark" ? "/bb-white.png" : "/bb-black.png"}
                alt="App logo"
                width={250}
                height={40}
                className="rounded-xl"
                priority
              />
            </div>
            <Link
              href="/login"
              className="
                flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2
                text-white transition hover:bg-slate-800
                dark:bg-slate-100 dark:text-slate-950
              "
            >
              <span>Login</span>
            </Link>

            <button
              onClick={toggleTheme}
              className="
                rounded-full p-2 transition
                hover:bg-slate-200
                dark:hover:bg-slate-800
              "
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>)}
        </div>
      </div>
    </header>
  );
}