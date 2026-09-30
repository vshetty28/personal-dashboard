"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { addTask, completeTask } from "@/app/actions";
import type { DashboardTask } from "@/lib/ticktick";

/** TickTick tasks due today or overdue. Checking a box completes it in TickTick. */
export function TasksPanel({ tasks }: { tasks: DashboardTask[] | null }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();
  const [, startComplete] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (tasks === null) {
    return (
      <section id="tasks">
        <h2 className="mb-2 text-[17px] font-semibold md:text-lg">Tasks</h2>
        <a href="/api/integrations/ticktick/connect" className="text-sm font-medium underline underline-offset-4">
          Connect TickTick
        </a>
      </section>
    );
  }

  const open = tasks.filter((t) => !completed.has(t.id)).length;

  function complete(t: DashboardTask) {
    if (completed.has(t.id)) return;
    setCompleted((s) => new Set(s).add(t.id));
    setError(null);
    startComplete(async () => {
      try {
        await completeTask(t.projectId, t.id);
      } catch {
        setCompleted((s) => {
          const n = new Set(s);
          n.delete(t.id);
          return n;
        });
        setError("TickTick didn't accept that. Try again, or open it in TickTick.");
      }
    });
  }

  function add(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    setError(null);
    startAdd(async () => {
      try {
        await addTask(title);
        if (inputRef.current) inputRef.current.value = "";
      } catch {
        setError("Couldn't add that to TickTick.");
      }
    });
  }

  return (
    <section id="tasks" className="scroll-mt-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold md:text-lg">Tasks</h2>
        <a href="https://ticktick.com/webapp" target="_blank" rel="noreferrer" className="text-[13px] text-dim hover:text-fg">
          {open} open · TickTick
        </a>
      </div>

      {tasks.length === 0 ? (
        <p className="py-3 text-sm text-dim">Nothing due today.</p>
      ) : (
        <ul className="scroll-thin lg:max-h-[268px] lg:overflow-y-auto lg:pr-1.5">
          {tasks.map((t) => {
            const done = completed.has(t.id);
            return (
              <li key={t.id} className="flex min-h-[46px] items-center gap-1 border-b border-[#1F1E1B] md:min-h-11">
                <button
                  type="button"
                  onClick={() => complete(t)}
                  disabled={done}
                  aria-label={`Complete ${t.title}`}
                  className="-ml-2.5 flex h-11 w-10 shrink-0 items-center justify-center text-canvas"
                >
                  <span
                    className={
                      "flex size-[19px] items-center justify-center rounded-md border-[1.5px] md:size-[18px] md:rounded-[5px] " +
                      (done ? "border-fg bg-fg" : t.overdue ? "border-act" : "border-[#55524B]")
                    }
                  >
                    {done && <Check className="size-3" strokeWidth={3.4} />}
                  </span>
                </button>
                <a
                  href={t.webLink}
                  target="_blank"
                  rel="noreferrer"
                  className={"min-w-0 flex-1 truncate text-[14.5px] " + (done ? "text-faint line-through" : "text-fg")}
                >
                  {t.title}
                </a>
                {t.overdue && !done && (
                  <span className="shrink-0 rounded-[5px] bg-act-chip px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-act">
                    {t.lateDays}d late
                  </span>
                )}
                <span className="ml-1.5 hidden shrink-0 text-xs text-faint sm:inline">{t.projectName}</span>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-2 text-[13px] text-act">{error}</p>}

      <form action={add} className="mt-2.5 flex h-[42px] items-center gap-2.5 rounded-[9px] border border-line bg-surface px-3">
        <Plus className="size-3.5 text-dim" strokeWidth={2.2} />
        <label htmlFor="quick-add" className="sr-only">
          Add a task to TickTick
        </label>
        <input
          ref={inputRef}
          id="quick-add"
          name="title"
          placeholder="Add to TickTick Inbox, due today"
          disabled={adding}
          className="h-[38px] min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-faint"
        />
      </form>
    </section>
  );
}
