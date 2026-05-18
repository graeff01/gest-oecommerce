"use client";

import { useTransition } from "react";
import { toggleUserActiveAction } from "@/app/(app)/actions/settings";

export function ToggleUserButton({ userId, active }: { userId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", userId);
      await toggleUserActiveAction(fd);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={pending}
        className={`status-pill whitespace-nowrap transition hover:opacity-70 disabled:pointer-events-none disabled:opacity-50 ${active ? "" : "pill-neutral"}`}
      >
        {pending ? "..." : active ? "Ativo" : "Inativo"}
      </button>
    </form>
  );
}
