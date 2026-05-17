"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, Boxes, ChevronDown, Flame, MessageCircle, PackageSearch, Search, X } from "lucide-react";
import { adjustStockAction } from "@/app/(app)/actions/products";
import { money } from "@/lib/format";
import { buildProductPromotionMessage, whatsappShareUrl } from "@/lib/whatsapp";

type MobileVariant = {
  id: string;
  sku: string;
  color: string;
  size: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStock: number;
};

type MobileProduct = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  gender: string | null;
  status: string;
  tags: string[];
  variants: MobileVariant[];
};

type StagnantProduct = {
  id: string;
  name: string;
  stock: number;
  minPrice: number | null;
  daysWithoutSale: number | null;
  message: string;
};

type ReorderProduct = {
  id: string;
  name: string;
  stock: number;
  sold30: number;
  lowStockSkus: number;
  suggestedQty: number;
  priority: "high" | "medium" | "low";
};

type MobileFilter = "action" | "all" | "low" | "out" | "stuck";

function productSummary(product: MobileProduct) {
  const stock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
  const low = product.variants.some((variant) => variant.stockQuantity <= variant.minStock);
  const out = stock === 0;
  const prices = product.variants.map((variant) => variant.salePrice);
  return {
    stock,
    low,
    out,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    searchable: [
      product.name,
      product.category,
      product.brand,
      product.gender,
      ...product.tags,
      ...product.variants.flatMap((variant) => [variant.sku, variant.color, variant.size])
    ].filter(Boolean).join(" ").toLowerCase()
  };
}

function AdjustStockPopover({ variant }: { variant: MobileVariant }) {
  return (
    <>
      <button
        type="button"
        popoverTarget={`mobile-stock-${variant.id}`}
        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-warning/25 bg-warning-soft px-3 text-[0.74rem] font-semibold text-warning"
      >
        <ArrowDownUp size={13} />
        Estoque
      </button>
      <div
        id={`mobile-stock-${variant.id}`}
        popover="auto"
        className="w-[min(92vw,360px)] rounded-2xl border border-border bg-surface p-4 shadow-xl backdrop:bg-fg/20"
      >
        <form action={adjustStockAction} className="grid gap-3">
          <input type="hidden" name="variantId" value={variant.id} />
          <div>
            <p className="font-display text-base font-semibold text-fg">Ajustar estoque</p>
            <p className="mt-1 text-[0.76rem] text-muted">{variant.sku} · atual {variant.stockQuantity} un.</p>
          </div>
          <label className="label">
            Tipo
            <select className="field" name="type" defaultValue="IN">
              <option value="IN">Entrada</option>
              <option value="OUT">Saida</option>
              <option value="ADJUSTMENT">Ajuste exato</option>
              <option value="RETURN">Devolucao</option>
            </select>
          </label>
          <label className="label">
            Quantidade
            <input className="field" name="quantity" type="number" min="1" defaultValue="1" required />
          </label>
          <label className="label">
            Motivo
            <input className="field" name="reason" defaultValue="Ajuste pelo celular" required />
          </label>
          <button className="button-primary">Salvar estoque</button>
        </form>
      </div>
    </>
  );
}

export function ProductMobileInventory({
  products,
  stagnantProducts,
  reorderProducts
}: {
  products: MobileProduct[];
  stagnantProducts: StagnantProduct[];
  reorderProducts: ReorderProduct[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MobileFilter>("action");
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const summaries = useMemo(() => new Map(products.map((product) => [product.id, productSummary(product)])), [products]);
  const stagnantIds = useMemo(() => new Set(stagnantProducts.map((product) => product.id)), [stagnantProducts]);
  const reorderIds = useMemo(() => new Set(reorderProducts.map((product) => product.id)), [reorderProducts]);

  const filtered = products.filter((product) => {
    const summary = summaries.get(product.id)!;
    const normalized = query.trim().toLowerCase();
    if (normalized && !summary.searchable.includes(normalized)) return false;
    if (filter === "low") return summary.low;
    if (filter === "out") return summary.out;
    if (filter === "stuck") return stagnantIds.has(product.id);
    if (filter === "action") return summary.low || stagnantIds.has(product.id) || reorderIds.has(product.id);
    return true;
  });

  const totalStock = products.reduce((sum, product) => sum + (summaries.get(product.id)?.stock ?? 0), 0);
  const lowCount = products.filter((product) => summaries.get(product.id)?.low).length;
  const outCount = products.filter((product) => summaries.get(product.id)?.out).length;
  const topReorder = reorderProducts[0] ?? null;

  return (
    <section className="grid gap-4 md:hidden">
      <div className="surface-card overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-2 p-5 text-primary-fg">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-primary-fg/70">Estoque mobile</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-primary-fg">Consulta rapida</h2>
          <p className="mt-1 text-[0.82rem] text-primary-fg/72">Busque produto, SKU, cor ou tamanho e aja sem sair da tela.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/13 p-3 backdrop-blur">
              <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-primary-fg/62">Unid.</p>
              <p className="mt-1 font-display text-lg font-semibold">{totalStock}</p>
            </div>
            <div className="rounded-xl bg-white/13 p-3 backdrop-blur">
              <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-primary-fg/62">Baixo</p>
              <p className="mt-1 font-display text-lg font-semibold">{lowCount}</p>
            </div>
            <div className="rounded-xl bg-white/13 p-3 backdrop-blur">
              <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-primary-fg/62">Zerado</p>
              <p className="mt-1 font-display text-lg font-semibold">{outCount}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3">
            <Search size={16} className="text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-fg outline-none placeholder:font-normal placeholder:text-subtle"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Produto, SKU, cor ou tamanho"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="grid h-7 w-7 place-items-center rounded-lg text-muted">
                <X size={14} />
              </button>
            ) : null}
          </label>

          <div className="scrollbar-none flex gap-2 overflow-x-auto">
            {([
              ["action", "Agir hoje"],
              ["all", "Todos"],
              ["low", "Baixo"],
              ["out", "Zerado"],
              ["stuck", "Parados"]
            ] as [MobileFilter, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`min-h-9 shrink-0 rounded-xl border px-3 text-[0.78rem] font-semibold ${
                  filter === id ? "border-primary/25 bg-primary-soft text-primary" : "border-border bg-surface text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {topReorder ? (
        <div className="surface-card border-warning/25 bg-warning-soft/45 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning text-primary-fg">
              <AlertTriangle size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-warning">Reposicao indicada</p>
              <h3 className="mt-1 truncate font-display text-base font-semibold text-fg">{topReorder.name}</h3>
              <p className="mt-1 text-[0.78rem] text-muted">Repor {topReorder.suggestedQty} un. · vendeu {topReorder.sold30} em 30 dias</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {filtered.length ? filtered.map((product) => {
          const summary = summaries.get(product.id)!;
          const stagnant = stagnantProducts.find((item) => item.id === product.id);
          const reorder = reorderProducts.find((item) => item.id === product.id);
          const open = openProductId === product.id;
          const message = stagnant?.message ?? buildProductPromotionMessage({
            productName: product.name,
            price: summary.minPrice,
            stock: summary.stock,
            daysWithoutSale: stagnant?.daysWithoutSale
          });

          return (
            <article key={product.id} className="surface-card overflow-hidden p-4">
              <button type="button" onClick={() => setOpenProductId(open ? null : product.id)} className="grid w-full gap-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-semibold text-fg">{product.name}</h3>
                    <p className="mt-1 truncate text-[0.76rem] text-muted">{product.category} · {product.brand || "sem marca"}</p>
                  </div>
                  <span className={summary.low ? "status-pill pill-danger shrink-0" : "status-pill shrink-0"}>{summary.stock} un.</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-surface-2/35 p-2.5">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-wide text-muted">Preco</p>
                    <p className="mt-1 truncate text-[0.82rem] font-semibold text-fg">{summary.minPrice ? money(summary.minPrice) : "-"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-2/35 p-2.5">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-wide text-muted">SKUs</p>
                    <p className="mt-1 text-[0.82rem] font-semibold text-fg">{product.variants.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-2/35 p-2.5">
                    <p className="text-[0.64rem] font-semibold uppercase tracking-wide text-muted">Min.</p>
                    <p className="mt-1 text-[0.82rem] font-semibold text-fg">{product.variants.reduce((sum, variant) => sum + variant.minStock, 0)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {summary.low ? <span className="chip border-danger/20 bg-danger-soft text-danger">estoque baixo</span> : null}
                  {summary.out ? <span className="chip border-danger/20 bg-danger-soft text-danger">zerado</span> : null}
                  {stagnant ? <span className="chip border-warning/20 bg-warning-soft text-warning">parado</span> : null}
                  {reorder ? <span className="chip border-primary/20 bg-primary-soft text-primary">repor {reorder.suggestedQty}</span> : null}
                </div>
              </button>

              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 border-t border-border pt-3">
                <a
                  href={whatsappShareUrl(message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-success/25 bg-success-soft px-3 text-[0.78rem] font-semibold text-success"
                >
                  <MessageCircle size={14} />
                  Divulgar
                </a>
                <button type="button" onClick={() => setOpenProductId(open ? null : product.id)} className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted">
                  <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
                </button>
              </div>

              {open ? (
                <div className="mt-3 grid gap-2 border-t border-border pt-3">
                  {product.variants.length ? product.variants.map((variant) => (
                    <div key={variant.id} className="rounded-xl border border-border bg-surface-2/35 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[0.84rem] font-semibold text-fg">{variant.color} · {variant.size}</p>
                          <p className="mt-0.5 truncate text-[0.72rem] text-muted">{variant.sku}</p>
                        </div>
                        <span className={variant.stockQuantity <= variant.minStock ? "status-pill pill-danger shrink-0" : "chip shrink-0"}>
                          {variant.stockQuantity} un.
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[0.72rem] text-muted">Venda <b className="text-fg">{money(variant.salePrice)}</b> · min. {variant.minStock}</p>
                        <AdjustStockPopover variant={variant} />
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-[0.78rem] text-muted">
                      Sem variacoes cadastradas.
                    </div>
                  )}
                </div>
              ) : null}
            </article>
          );
        }) : (
          <div className="surface-card p-6 text-center">
            <PackageSearch className="mx-auto text-muted" size={24} />
            <p className="mt-3 font-semibold text-fg">Nada encontrado.</p>
            <p className="mt-1 text-[0.8rem] text-muted">Tente outro termo ou mude o filtro.</p>
          </div>
        )}
      </div>
    </section>
  );
}
