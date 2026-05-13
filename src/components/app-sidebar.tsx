"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  LayoutDashboard,
  PackagePlus,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UsersRound
} from "lucide-react";
import { SidebarTips } from "@/components/sidebar-tips";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Produtos", icon: ShoppingBag },
  { href: "/vendas", label: "Vendas", icon: ReceiptText },
  { href: "/financeiro", label: "Financeiro", icon: CircleDollarSign },
  { href: "/clientes", label: "Clientes", icon: UsersRound },
  { href: "/fornecedores", label: "Fornecedores", icon: Building2 },
  { href: "/compras", label: "Compras", icon: PackagePlus },
  { href: "/movimentacoes", label: "Movimentações", icon: TrendingUp },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings }
];

export function AppSidebar({
  storeName,
  storeTagline
}: {
  storeName: string;
  storeTagline?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const item of nav) router.prefetch(item.href);
  }, [router]);

  return (
    <aside className="fixed bottom-3 left-3 right-3 z-20 rounded-2xl border border-border bg-surface/85 p-2 shadow-elev backdrop-blur-xl lg:bottom-4 lg:left-4 lg:right-auto lg:top-4 lg:flex lg:h-auto lg:w-[262px] lg:flex-col lg:overflow-y-auto lg:p-3">
      {/* logo / brand */}
      <div className="hidden px-2 pb-5 pt-2 lg:block">
        <Link href="/" className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
            <ShoppingBag size={19} strokeWidth={2.4} />
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-fg">
              <Sparkles size={9} strokeWidth={2.5} />
            </span>
          </span>
          <div className="min-w-0 leading-tight">
            <strong className="block truncate font-display text-[1rem] font-bold tracking-tight text-fg">
              {storeName}
            </strong>
            <span className="block truncate text-[0.7rem] font-medium text-muted">
              {storeTagline || "Operação inteligente"}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto lg:grid lg:gap-0.5">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => router.prefetch(item.href)}
              onFocus={() => router.prefetch(item.href)}
              className={`group relative flex min-w-12 items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-[0.86rem] font-medium transition lg:justify-start ${
                active ? "text-fg" : "text-muted hover:text-fg"
              }`}
              title={item.label}
            >
              {active ? (
                <motion.span
                  layoutId="sidebar-indicator"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 -z-0 rounded-xl bg-gradient-to-br from-primary-soft to-primary-soft/60 ring-1 ring-primary/25"
                />
              ) : null}
              {active ? (
                <span className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary lg:block" />
              ) : null}
              <span className="relative z-10 grid h-7 w-7 place-items-center rounded-lg transition">
                <item.icon
                  size={17}
                  strokeWidth={active ? 2.4 : 1.9}
                  className={active ? "text-primary" : "text-muted group-hover:text-fg"}
                />
              </span>
              <span className={`relative z-10 hidden lg:inline ${active ? "font-semibold text-fg" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden lg:mt-auto lg:block lg:pt-5">
        <SidebarTips />
      </div>
    </aside>
  );
}
