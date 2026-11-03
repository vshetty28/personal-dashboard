"use client";

import { createContext, useContext, useState, useTransition, type ComponentProps, type ReactNode, type TransitionStartFunction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";

const ActivityContext = createContext<{ pending: boolean; start: TransitionStartFunction; syncing: boolean; sync: () => void } | null>(null);

export function DashboardActivity({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [syncing, startSync] = useTransition();
  const [requestedSync, setRequestedSync] = useState(false);
  function sync() {
    setRequestedSync(true);
    startSync(() => router.refresh());
  }
  return (
    <ActivityContext.Provider value={{ pending, start, syncing, sync }}>
      {children}
      {(pending || syncing) && (
        <div role="status" className="fixed top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line-strong bg-raised px-4 py-2 text-xs text-fg shadow-lg">
          <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
          {syncing ? "Syncing dashboard…" : "Loading…"}
        </div>
      )}
      <span role="status" className="sr-only">{requestedSync && !syncing ? "Dashboard refresh complete." : ""}</span>
    </ActivityContext.Provider>
  );
}

/** Keep native Link behavior (including new tabs) while tracking route transitions. */
export function DashboardLink({ href, onNavigate, ...props }: ComponentProps<typeof Link>) {
  const activity = useContext(ActivityContext);
  const router = useRouter();
  return <Link {...props} href={href} onNavigate={(event) => {
    onNavigate?.(event);
    if (!activity || typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return;
    const destination = new URL(href, window.location.origin);
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
    event.preventDefault();
    activity.start(() => {
      if (props.replace) router.replace(href, { scroll: props.scroll });
      else router.push(href, { scroll: props.scroll });
    });
  }} />;
}

export function SyncButton() {
  const activity = useContext(ActivityContext);
  return (
    <button type="button" onClick={activity?.sync} disabled={activity?.syncing || activity?.pending} aria-label="Sync dashboard" title="Reload the latest briefing, calendar and tasks" className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-[9px] border border-line-strong px-2.5 text-xs text-fg-2 hover:bg-raised disabled:opacity-60">
      <RefreshCw aria-hidden="true" className={"size-4 " + (activity?.syncing ? "motion-safe:animate-spin" : "")} />
      <span className="hidden sm:inline">{activity?.syncing ? "Syncing…" : "Sync"}</span>
    </button>
  );
}
