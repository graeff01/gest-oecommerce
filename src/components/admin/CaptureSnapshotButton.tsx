"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { captureAllSnapshotsAction, captureClientSnapshotAction } from "@/app/(admin)/admin/actions";

export function CaptureAllSnapshotsButton() {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      await captureAllSnapshotsAction();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[0.78rem] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
      title="Salvar snapshot historico do estado atual de todos os clientes"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
      {loading ? "Capturando..." : "Snapshot"}
    </button>
  );
}

export function CaptureClientSnapshotButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const fd = new FormData();
    fd.set("id", clientId);
    try {
      await captureClientSnapshotAction(fd);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-surface-2 disabled:opacity-60"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
      {loading ? "Capturando..." : "Capturar snapshot"}
    </button>
  );
}
