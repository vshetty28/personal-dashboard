"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Sign out"
      className="flex size-9 items-center justify-center rounded-[9px] border border-line-strong text-dim hover:text-fg"
    >
      <LogOut className="size-4" />
    </button>
  );
}
