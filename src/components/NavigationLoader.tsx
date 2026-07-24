"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavigationLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest("a");

      if (
        link &&
        link.href &&
        link.origin === window.location.origin &&
        link.pathname !== window.location.pathname
      ) {
        setLoading(true);
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm dark:bg-black/30">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
    </div>
  );
}