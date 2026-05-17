"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RefreshCw } from "lucide-react";

export function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [last, setLast] = useState<Date>(() => new Date());
  const [tick, setTick] = useState(0);

  // tick every second so we can show elapsed time
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // refresh on interval
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      router.refresh();
      setLast(new Date());
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, router]);

  const elapsedSec = Math.floor((Date.now() - last.getTime()) / 1000);
  const nextSec = Math.max(0, Math.floor(intervalMs / 1000) - elapsedSec);
  void tick; // keep ref to force rerender

  function manualRefresh() {
    router.refresh();
    setLast(new Date());
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-1.5 py-1 text-[0.7rem] text-white/70 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-white/10"
        title={enabled ? "Pausar atualizacao automatica" : "Retomar"}
      >
        {enabled ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <button
        type="button"
        onClick={manualRefresh}
        className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-white/10"
        title="Atualizar agora"
      >
        <RefreshCw size={12} />
      </button>
      <span className="px-1.5 text-[0.66rem] font-semibold">
        {enabled ? `${nextSec}s` : "pausado"}
      </span>
    </div>
  );
}
