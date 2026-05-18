"use client";

import { useRef } from "react";
import { X } from "lucide-react";

interface DeleteButtonProps {
  label?: string;
  confirmMessage?: string;
  className?: string;
}

export function DeleteButton({
  label,
  confirmMessage = "Tem certeza que deseja excluir?",
  className = "text-[0.74rem] text-muted transition hover:text-danger"
}: DeleteButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!confirm(confirmMessage)) {
      e.preventDefault();
      return;
    }
    if (ref.current) {
      ref.current.disabled = true;
    }
  }

  return (
    <button ref={ref} type="submit" className={className} onClick={handleClick}>
      {label ?? <X size={13} />}
    </button>
  );
}
