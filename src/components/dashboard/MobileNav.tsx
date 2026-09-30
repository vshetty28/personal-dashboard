"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Newspaper, Sunrise } from "lucide-react";

const TABS = [
  { href: "/", label: "Today", Icon: Sunrise },
  { href: "/briefing", label: "Briefing", Icon: Newspaper },
  { href: "/history", label: "History", Icon: CalendarDays },
];

/** Bottom tab bar on phones (the installed PWA); hidden from md up. */
export function MobileNav({ date }: { date?: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-[#141413]/95 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur md:hidden"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        const target = date && href !== "/history" ? `${href}?date=${date}` : href;
        return (
          <Link
            key={href}
            href={target}
            aria-current={active ? "page" : undefined}
            className={"flex flex-col items-center gap-1 py-1 text-[11px] " + (active ? "font-semibold text-fg" : "text-dim")}
          >
            <Icon className="size-[22px]" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
