import Link from "next/link";
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
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-5 md:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 md:w-[300px]">
          <span className="flex size-7 items-center justify-center rounded-[7px] bg-fg text-canvas">
            <Sunrise className="size-4" strokeWidth={2.2} />
          </span>
          <span className="hidden text-[17px] font-semibold sm:inline">Brief</span>
        </Link>

        <nav aria-label="Choose day" className="scroll-thin flex min-w-0 gap-1 overflow-x-auto">
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
              <span className="flex h-1 gap-0.5">
                <span
                  className="size-1 rounded-full"
                  style={{ background: d.hasBriefing ? (d.selected ? "#0F0F0E" : "#4A4843") : "transparent" }}
                />
                <span className="size-1 rounded-full" style={{ background: d.weekend ? "#F4C152" : "transparent" }} />
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-3 md:w-[300px]">
          {syncedAt && (
            <span className="hidden items-center gap-2 text-[13px] text-dim lg:flex">
              <span className="size-[7px] rounded-full bg-up" />
              Briefing synced {syncedAt}
            </span>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
