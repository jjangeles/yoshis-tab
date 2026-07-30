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

      if (!link) return;

      // 1. IGNORE DOWNLOAD LINKS (This fixes your issue!)
      if (link.hasAttribute("download")) return;

      // 2. IGNORE NON-ROUTING SCHEMES (blob:, data:, mailto:, tel:)
      if (
        link.href.startsWith("blob:") ||
        link.href.startsWith("data:") ||
        link.href.startsWith("mailto:") ||
        link.href.startsWith("tel:")
      ) {
        return;
      }

      // 3. IGNORE NEW TABS OR MODIFIER CLICKS
      if (
        link.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      // 4. ONLY TRIGGER ON ACTUAL ROUTE CHANGES
      if (
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