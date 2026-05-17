"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export function TvMode() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function onFs() {
      setActive(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (active) {
      document.documentElement.classList.add("tv-mode");
    } else {
      document.documentElement.classList.remove("tv-mode");
    }
    return () => document.documentElement.classList.remove("tv-mode");
  }, [active]);

  async function toggle() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // browser blocked - fall back to class toggle only
      setActive((v) => !v);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[0.78rem] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
      title={active ? "Sair do modo TV" : "Modo TV (apresentacao)"}
    >
      {active ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      {active ? "Sair TV" : "Modo TV"}
    </button>
  );
}
