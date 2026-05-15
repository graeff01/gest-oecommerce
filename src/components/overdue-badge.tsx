"use client";

import { useEffect, useState } from "react";

export function OverdueBadge({ iconOnly = false }: { iconOnly?: boolean } = {}) {
  const [count, setCount] = useState<number>(0);

  async function fetchCount() {
    try {
      const res = await fetch("/api/installments/overdue-count");
      if (!res.ok) return;
      const data = (await res.json()) as { count: number };
      setCount(data.count);
    } catch {
      // silently ignore network errors
    }
  }

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (count <= 0) return null;

  if (iconOnly) {
    return (
      <span
        className="block h-2 w-2 rounded-full bg-danger"
        title={`${count} ${count === 1 ? "parcela vencida" : "parcelas vencidas"}`}
      />
    );
  }

  return (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.6rem] font-bold leading-none text-white"
      title={`${count} ${count === 1 ? "parcela vencida" : "parcelas vencidas"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
