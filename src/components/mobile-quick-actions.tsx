"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, PackageSearch, ReceiptText, UserPlus } from "lucide-react";

const actions = [
  { href: "/vendas", label: "Vender", icon: ReceiptText },
  { href: "/clientes", label: "Cliente", icon: UserPlus },
  { href: "/produtos", label: "Estoque", icon: PackageSearch },
  { href: "/credario", label: "Cobrar", icon: CreditCard }
];

export function MobileQuickActions() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-[calc(5.15rem+env(safe-area-inset-bottom))] z-20 grid grid-cols-4 gap-1 rounded-2xl border border-border bg-surface/95 p-1.5 shadow-elev backdrop-blur-xl md:hidden">
      {actions.map((action) => {
        const active = action.href === "/" ? pathname === "/" : pathname.startsWith(action.href);
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[0.66rem] font-semibold transition ${
              active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon size={16} strokeWidth={2.15} />
            <span className="max-w-full truncate">{action.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
