"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ total, page, pageSize }: { total: number; page: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`${pathname}?${next.toString()}`);
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2 text-[0.82rem] text-muted">
      <span>{from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 transition hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="px-2 font-medium text-fg">{page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 transition hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
