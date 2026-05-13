"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid h-full place-items-center p-8">
      <div className="grid max-w-md gap-5 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <AlertTriangle size={24} strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-fg">Algo deu errado</h2>
          <p className="mt-2 text-[0.88rem] font-normal text-muted">
            {error.message || "Ocorreu um erro inesperado. Tente novamente ou contate o suporte."}
          </p>
        </div>
        <button
          onClick={reset}
          className="button-primary mx-auto flex items-center gap-2"
        >
          <RefreshCw size={15} />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
