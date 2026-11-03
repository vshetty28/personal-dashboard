import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="mx-auto w-full max-w-[1440px] px-5 py-5 md:px-12">
      <div className="flex h-11 items-center gap-2 border-b border-line pb-4 text-sm text-fg-2">
        <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
        Loading your dashboard…
      </div>
      <div aria-hidden="true" className="space-y-6 pt-8 motion-safe:animate-pulse">
        <div className="h-3 w-40 rounded bg-raised" />
        <div className="h-9 w-3/4 rounded-lg bg-raised" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 rounded-xl border border-line bg-surface" />)}
        </div>
        <div className="h-40 rounded-xl border border-line bg-surface" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-44 rounded-xl border border-line bg-surface" />)}
        </div>
      </div>
    </div>
  );
}
