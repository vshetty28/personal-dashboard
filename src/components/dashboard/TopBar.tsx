"use client";

import { DashboardLink as Link, SyncButton } from "@/components/dashboard/DashboardActivity";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sunrise } from "lucide-react";
import { SignOutButton } from "./SignOutButton";

export type StripDay = {
  date: string;
  dow: string;
  num: string;
  selected: boolean;
  hasBriefing: boolean;
  weekend: boolean;
  href: string;
};

export function TopBar({ days, syncedAt }: { days: StripDay[]; syncedAt: string | null }) {
  const strip = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const selectedDate = days.find((day) => day.selected)?.date;
  useEffect(() => {
    const selected = strip.current?.querySelector<HTMLElement>('[aria-current="date"]');
    if (selected && strip.current) {
      strip.current.scrollLeft = selected.offsetLeft - strip.current.offsetLeft - (strip.current.clientWidth - selected.clientWidth) / 2;
    }
  }, [selectedDate]);

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-5 md:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 lg:w-[180px]">
          <span className="flex size-7 items-center justify-center rounded-[7px] bg-fg text-canvas">
            <Sunrise className="size-4" strokeWidth={2.2} />
          </span>
          <span className="hidden text-[17px] font-semibold sm:inline">Brief</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 md:gap-3">
          <nav ref={strip} aria-label="Choose day" className="date-strip relative flex min-w-0 gap-1 overflow-x-auto rounded-xl bg-sunk p-1">
            {days.map((d) => (
              <Link
                key={d.date}
                href={d.href}
                aria-current={d.selected ? "date" : undefined}
                aria-label={`${d.dow} ${d.date}${d.weekend ? ", weekend briefing" : ""}`}
                className={
                  "flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center gap-px rounded-[10px] md:w-[50px] " +
                  (d.selected ? "bg-fg text-canvas" : "text-fg-2 hover:bg-surface")
                }
              >
                <span className="text-[10px] font-semibold tracking-[0.08em] uppercase opacity-75">{d.dow}</span>
                <span className="font-mono text-[15px] font-semibold">{d.num}</span>
                <span aria-hidden="true" className="flex h-1 items-center justify-center gap-0.5">
                  {d.hasBriefing && <span className={"size-1 rounded-full " + (d.selected ? "bg-canvas" : "bg-dim")} />}
                  {d.weekend && <span className="size-1 rounded-full bg-gold" />}
                </span>
              </Link>
            ))}
          </nav>
          <Link href={pathname === "/briefing" ? "/briefing" : "/"} className="flex h-9 shrink-0 items-center rounded-lg border border-line-strong px-2.5 text-[11px] font-semibold tracking-wider text-fg-2 hover:bg-raised">TODAY</Link>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {syncedAt && (
            <span className="hidden items-center gap-2 text-[13px] text-dim lg:flex">
              <span className="size-[7px] rounded-full bg-up" />
              Briefing synced {syncedAt}
            </span>
          )}
          <SyncButton />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
