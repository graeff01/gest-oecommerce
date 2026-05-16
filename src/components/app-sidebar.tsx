"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  CreditCard,
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
import { OverdueBadge } from "@/components/overdue-badge";

// cor temática de cada item: [gradiente-from, gradiente-to, cor-do-anel]
const nav = [
  { href: "/",              label: "Dashboard",     icon: LayoutDashboard, from: "#6366f1", to: "#818cf8", ring: "#6366f130" },
  { href: "/produtos",      label: "Produtos",      icon: ShoppingBag,     from: "#ec4899", to: "#f472b6", ring: "#ec489930" },
  { href: "/vendas",        label: "Vendas",        icon: ReceiptText,     from: "#10b981", to: "#34d399", ring: "#10b98130" },
  { href: "/financeiro",    label: "Financeiro",    icon: CircleDollarSign,from: "#f59e0b", to: "#fbbf24", ring: "#f59e0b30" },
  { href: "/clientes",      label: "Clientes",      icon: UsersRound,      from: "#3b82f6", to: "#60a5fa", ring: "#3b82f630" },
  { href: "/credario",      label: "Crediário",     icon: CreditCard,      from: "#ef4444", to: "#f87171", ring: "#ef444430" },
  { href: "/fornecedores",  label: "Fornecedores",  icon: Building2,       from: "#8b5cf6", to: "#a78bfa", ring: "#8b5cf630" },
  { href: "/compras",       label: "Compras",       icon: PackagePlus,     from: "#0ea5e9", to: "#38bdf8", ring: "#0ea5e930" },
  { href: "/movimentacoes", label: "Movimentações", icon: TrendingUp,      from: "#14b8a6", to: "#2dd4bf", ring: "#14b8a630" },
  { href: "/relatorios",    label: "Relatórios",    icon: BarChart3,       from: "#f97316", to: "#fb923c", ring: "#f9731630" },
  { href: "/configuracoes", label: "Configurações", icon: Settings,        from: "#6b7280", to: "#9ca3af", ring: "#6b728030" },
];

const COLLAPSED_KEY = "sidebar-collapsed";

export function AppSidebar({
  storeName,
  storeTagline
}: {
  storeName: string;
  storeTagline?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === "1") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1");
      return !prev;
    });
  };

  useEffect(() => {
    for (const item of nav) router.prefetch(item.href);
  }, [router]);

  return (
    <aside
      className={`fixed bottom-2 left-2 right-2 z-20 rounded-2xl border border-border bg-surface/92 p-1.5 shadow-elev backdrop-blur-xl transition-[width] duration-200 sm:bottom-3 sm:left-3 sm:right-3 sm:p-2
        lg:bottom-4 lg:left-4 lg:right-auto lg:top-4 lg:flex lg:h-[calc(100dvh-2rem)] lg:flex-col lg:overflow-y-auto lg:p-3
        ${collapsed ? "lg:w-[64px]" : "lg:w-[262px]"}`}
    >
      {/* logo / brand — desktop */}
      <div className={`hidden pb-4 pt-2 lg:block ${collapsed ? "px-0" : "px-2"}`}>
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className={`flex min-w-0 items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2 ${collapsed ? "justify-center" : ""}`}
          >
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
              <ShoppingBag size={17} strokeWidth={2.4} />
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-fg">
                <Sparkles size={9} strokeWidth={2.5} />
              </span>
            </span>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0 overflow-hidden leading-tight"
                >
                  <strong className="block truncate font-display text-[0.95rem] font-bold tracking-tight text-fg">
                    {storeName}
                  </strong>
                  <span className="block truncate text-[0.68rem] font-medium text-muted">
                    {storeTagline || "Operação inteligente"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          <button
            onClick={toggle}
            title={collapsed ? "Expandir menu" : "Minimizar menu"}
            className="hidden shrink-0 lg:grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <motion.span
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="grid place-items-center"
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </motion.span>
          </button>
        </div>
      </div>

      {/* nav */}
      <nav className="scrollbar-none flex gap-1 overflow-x-auto pb-[env(safe-area-inset-bottom)] lg:grid lg:gap-0.5 lg:overflow-x-visible lg:pb-0">
        {nav.map((item, index) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <motion.div
              key={item.href}
              initial={mounted ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.22, ease: "easeOut" }}
            >
              <Link
                href={item.href}
                prefetch
                onMouseEnter={() => router.prefetch(item.href)}
                onFocus={() => router.prefetch(item.href)}
                className={`group relative flex min-w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center text-[0.68rem] font-medium transition sm:min-w-[5.5rem] sm:text-[0.72rem]
                  lg:min-w-0 lg:w-full lg:flex-row lg:gap-3 lg:px-3 lg:py-2.5 lg:text-left lg:text-[0.86rem]
                  lg:shrink
                  ${collapsed ? "lg:justify-center lg:px-0" : "lg:justify-start"}
                  ${active ? "text-fg" : "text-muted hover:text-fg"}`}
                title={item.label}
              >
                {/* fundo do item ativo — muda cor conforme o item */}
                {active && (
                  <motion.span
                    layoutId="sidebar-indicator"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 -z-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${item.from}18, ${item.to}0d)`,
                      boxShadow: `inset 0 0 0 1px ${item.ring}`
                    }}
                  />
                )}
                {active && !collapsed && (
                  <motion.span
                    layoutId="sidebar-bar"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-full lg:block"
                    style={{ background: item.from }}
                  />
                )}

                {/* ícone com cor temática */}
                <motion.span
                  className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-200"
                  animate={active ? { scale: 1.08 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={active ? {
                    background: `linear-gradient(135deg, ${item.from}, ${item.to})`,
                    boxShadow: `0 2px 8px ${item.from}55`
                  } : {}}
                >
                  <item.icon
                    size={15}
                    strokeWidth={active ? 2.4 : 1.9}
                    style={{ color: active ? "#fff" : undefined }}
                    className={active ? "" : "text-muted transition group-hover:text-fg"}
                  />
                  {/* badge no ícone quando collapsed */}
                  {item.href === "/credario" && collapsed && (
                    <span className="absolute -right-1 -top-1">
                      <OverdueBadge iconOnly />
                    </span>
                  )}
                </motion.span>

                <motion.span
                  initial={mounted ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className={`relative z-10 max-w-[4.25rem] overflow-hidden text-ellipsis whitespace-nowrap sm:max-w-[5rem] lg:max-w-none ${collapsed ? "lg:hidden" : "lg:inline"} ${active ? "font-semibold text-fg" : ""}`}
                >
                  {item.label}
                </motion.span>

                {item.href === "/credario" && !collapsed && (
                  <span className="relative z-10 hidden lg:inline">
                    <OverdueBadge />
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="hidden lg:mt-auto lg:block lg:pt-5"
          >
            <SidebarTips />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
