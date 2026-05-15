"use client";

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
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!confirm(confirmMessage)) {
      e.preventDefault();
    }
  }

  return (
    <button type="submit" className={className} onClick={handleClick}>
      {label ?? <X size={13} />}
    </button>
  );
}
