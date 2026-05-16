"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ReceiptText, Package, X } from "lucide-react";

type SearchResult = {
  customers: { id: string; name: string; phone: string | null; email: string | null }[];
  orders: { id: string; code: string; customer: { name: string } | null; status: string; total: number }[];
  products: { id: string; name: string; category: string }[];
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults(null); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data: SearchResult = await res.json();
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // atalho Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const hasResults = results && (results.customers.length > 0 || results.orders.length > 0 || results.products.length > 0);
  const noResults = results && !hasResults;

  return (
    <div ref={containerRef} className="relative w-full max-w-none sm:max-w-sm">
      <label className="group flex h-9 items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 transition focus-within:border-primary/40 focus-within:bg-surface focus-within:shadow-ring">
        <Search size={14} className="shrink-0 text-subtle group-focus-within:text-primary" strokeWidth={2.1} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar… (Ctrl+K)"
          className="w-full bg-transparent text-[0.82rem] font-medium text-fg outline-none placeholder:font-normal placeholder:text-subtle"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setOpen(false); }} className="text-subtle hover:text-muted">
            <X size={12} />
          </button>
        )}
        {loading && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" />}
      </label>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[70dvh] overflow-y-auto rounded-2xl border border-border bg-elevated shadow-elev">
          {noResults && (
            <p className="px-4 py-6 text-center text-[0.84rem] text-muted">
              Nenhum resultado para <strong className="text-fg">"{query}"</strong>
            </p>
          )}

          {results?.customers.length ? (
            <div>
              <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                <Users size={12} className="text-muted" />
                <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">Clientes</span>
              </div>
              {results.customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate("/clientes")}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-success-soft text-success text-[0.7rem] font-bold">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.84rem] font-medium text-fg">{c.name}</p>
                    <p className="truncate text-[0.74rem] text-muted">{c.phone || c.email || "Sem contato"}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {results?.orders.length ? (
            <div className={results.customers.length ? "border-t border-border" : ""}>
              <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                <ReceiptText size={12} className="text-muted" />
                <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">Pedidos</span>
              </div>
              {results.orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => navigate("/vendas")}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary text-[0.65rem] font-bold">
                    #
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.84rem] font-medium text-fg">{o.code}</p>
                    <p className="truncate text-[0.74rem] text-muted">{o.customer?.name ?? "Avulsa"}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {results?.products.length ? (
            <div className={(results.customers.length || results.orders.length) ? "border-t border-border" : ""}>
              <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                <Package size={12} className="text-muted" />
                <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">Produtos</span>
              </div>
              {results.products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate("/produtos")}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning text-[0.65rem] font-bold">
                    P
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.84rem] font-medium text-fg">{p.name}</p>
                    <p className="truncate text-[0.74rem] text-muted">{p.category}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
