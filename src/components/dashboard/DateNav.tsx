"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function shiftDate(dateParam: string, days: number) {
  const d = new Date(`${dateParam}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DateNav({ date, isToday }: { date: string; isToday: boolean }) {
  const router = useRouter();

  function goTo(dateParam: string) {
    const isDefaultToday = dateParam === new Date().toISOString().slice(0, 10);
    router.push(isDefaultToday ? "/" : `/?date=${dateParam}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="icon-sm" onClick={() => goTo(shiftDate(date, -1))} aria-label="Previous day">
        <ChevronLeft />
      </Button>
      <Input
        type="date"
        value={date}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="h-7 w-[150px] text-sm"
      />
      <Button variant="outline" size="icon-sm" onClick={() => goTo(shiftDate(date, 1))} aria-label="Next day">
        <ChevronRight />
      </Button>
      {!isToday && (
        <Button variant="ghost" size="sm" onClick={() => goTo(new Date().toISOString().slice(0, 10))}>
          Today
        </Button>
      )}
    </div>
  );
}
