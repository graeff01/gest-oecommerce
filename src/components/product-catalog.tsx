"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  CircleDollarSign,
  Filter,
  Footprints,
  Layers3,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { money } from "@/lib/format";
import { createVariantAction, updateVariantAction, deleteVariantAction, deleteProductAction, adjustStockAction } from "@/app/(app)/actions/products";

type StockFilter = "all" | "low" | "out";

type CatalogVariant = {
  id: string;
  sku: string;
  color: string;
  size: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStock: number;
};

type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  gender: string | null;
  tags: string[];
  status: string;
  variants: CatalogVariant[];
};

type ProductSummary = CatalogProduct & {
  totalStock: number;
  lowStock: boolean;
  minPrice: number;
  maxPrice: number;
  section: string;
  searchable: string;
};

// paleta de gradientes para ícones — atribuída por hash do nome
const ICON_PALETTES = [
  { from: "#6366f1", to: "#818cf8", shadow: "#6366f140" }, // índigo
  { from: "#ec4899", to: "#f472b6", shadow: "#ec489940" }, // rosa
  { from: "#10b981", to: "#34d399", shadow: "#10b98140" }, // verde
  { from: "#f59e0b", to: "#fbbf24", shadow: "#f59e0b40" }, // âmbar
  { from: "#3b82f6", to: "#60a5fa", shadow: "#3b82f640" }, // azul
  { from: "#8b5cf6", to: "#a78bfa", shadow: "#8b5cf640" }, // violeta
  { from: "#0ea5e9", to: "#38bdf8", shadow: "#0ea5e940" }, // céu
  { from: "#14b8a6", to: "#2dd4bf", shadow: "#14b8a640" }, // teal
  { from: "#f97316", to: "#fb923c", shadow: "#f9731640" }, // laranja
  { from: "#ef4444", to: "#f87171", shadow: "#ef444440" }, // vermelho
];

// cores para tags — cicla pela lista
const TAG_PALETTES = [
  "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/40",
  "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700/40",
  "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700/40",
  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
  "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/40",
  "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700/40",
  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700/40",
];

function hashIndex(str: string, len: number) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % len;
}

function paletteFor(name: string) {
  return ICON_PALETTES[hashIndex(name, ICON_PALETTES.length)];
}

function tagColor(tag: string) {
  return TAG_PALETTES[hashIndex(tag, TAG_PALETTES.length)];
}

function iconFor(value: string) {
  const name = value.toLowerCase();
  if (name.includes("tenis") || name.includes("calc") || name.includes("sapato")) return Footprints;
  if (name.includes("roup") || name.includes("camis") || name.includes("vest") || name.includes("pijama") || name.includes("blus")) return Shirt;
  if (name.includes("premium") || name.includes("casual")) return ShoppingBag;
  return Tag;
}

function ProductIcon({ product, size = "md" }: { product: CatalogProduct; size?: "sm" | "md" }) {
  const Icon = iconFor(product.category || product.tags[0] || product.name);
  const palette = paletteFor(product.name);
  const dim = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const iconSize = size === "sm" ? 17 : 21;

  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-2xl text-white`}
      style={{
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        boxShadow: `0 4px 14px ${palette.shadow}`
      }}
    >
      <Icon size={iconSize} strokeWidth={2.1} />
    </span>
  );
}

function SectionIcon({ name, active }: { name: string; active: boolean }) {
  const Icon = iconFor(name);
  const palette = paletteFor(name);
  return (
    <span
      className="grid h-11 w-11 place-items-center rounded-xl transition"
      style={active ? {
        background: "rgba(255,255,255,0.18)",
        backdropFilter: "blur(8px)"
      } : {
        background: `linear-gradient(135deg, ${palette.from}22, ${palette.to}18)`,
        color: palette.from,
        border: `1px solid ${palette.from}30`
      }}
    >
      <Icon size={20} strokeWidth={2.1} style={active ? { color: "#fff" } : { color: palette.from }} />
    </span>
  );
}

function buildRows(products: CatalogProduct[]) {
  return products.map((product) => {
    const totalStock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
    const lowStock = product.variants.some((variant) => variant.stockQuantity <= variant.minStock);
    const prices = product.variants.map((variant) => variant.salePrice);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const section = product.tags[0] || product.category || "Sem secao";
    const searchable = [
      product.name,
      product.category,
      product.brand,
      product.gender,
      product.status,
      ...product.tags,
      ...product.variants.flatMap((variant) => [variant.sku, variant.color, variant.size])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return { ...product, totalStock, lowStock, minPrice, maxPrice, section, searchable };
  });
}

export function ProductCatalog({ products }: { products: CatalogProduct[] }) {
  const [query, setQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string | null>("__all__");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [adjustingVariantId, setAdjustingVariantId] = useState<string | null>(null);

  const rows = useMemo(() => buildRows(products), [products]);

  const sections = useMemo(() => {
    const map = new Map<string, ProductSummary[]>();
    for (const product of rows) {
      map.set(product.section, [...(map.get(product.section) ?? []), product]);
    }

    return Array.from(map.entries())
      .map(([name, items]) => ({
        name,
        items,
        stock: items.reduce((sum, item) => sum + item.totalStock, 0),
        variants: items.reduce((sum, item) => sum + item.variants.length, 0),
        lowStock: items.some((item) => item.lowStock)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const activeSection = selectedSection ?? "__all__";
  const normalized = query.trim().toLowerCase();
  const activeProducts = rows
    .filter((product) => activeSection === "__all__" || product.section === activeSection)
    .filter((product) => !normalized || product.searchable.includes(normalized))
    .filter((product) => {
      if (stockFilter === "all") return true;
      if (stockFilter === "low") return product.lowStock;
      if (stockFilter === "out") return product.totalStock === 0;
      return true;
    });
  const selectedProduct = rows.find((product) => product.id === selectedProductId) ?? null;
  const totalAllStock = rows.reduce((sum, product) => sum + product.totalStock, 0);
  const totalAllVariants = rows.reduce((sum, product) => sum + product.variants.length, 0);
  const hasAnyLowStock = rows.some((product) => product.lowStock);

  return (
    <section className="grid gap-5">
      <div className="surface-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-fg">Seções e tags</h2>
            <p className="text-[0.86rem] font-normal text-muted">Filtre por seção, status de estoque ou busque diretamente.</p>
          </div>
          <div className="flex flex-col gap-2 lg:w-[520px] lg:flex-row">
            <label className="group relative flex h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 transition focus-within:border-primary/40 focus-within:bg-surface focus-within:shadow-ring">
              <Search size={17} className="text-subtle group-focus-within:text-primary" strokeWidth={2.1} />
              <input
                className="w-full bg-transparent text-sm font-medium text-fg outline-none placeholder:font-normal placeholder:text-subtle"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar modelo, SKU, cor, tamanho ou tag"
              />
            </label>
            <div className="inline-flex h-11 items-center gap-1 rounded-xl border border-border bg-surface-2/60 p-1">
              <Filter size={14} className="ml-1.5 text-subtle" />
              {(
                [
                  { id: "all", label: "Todos" },
                  { id: "low", label: "Baixo" },
                  { id: "out", label: "Zerado" }
                ] as { id: StockFilter; label: string }[]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStockFilter(option.id)}
                  className={`relative rounded-lg px-2.5 py-1.5 text-[0.78rem] font-medium transition ${
                    stockFilter === option.id
                      ? "bg-surface text-fg shadow-soft"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <button
            type="button"
            onClick={() => setSelectedSection("__all__")}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
              activeSection === "__all__"
                ? "border-primary/40 bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow"
                : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
            }`}
          >
            {activeSection === "__all__" ? (
              <span className="absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,rgba(255,255,255,.15),transparent_60%)]" />
            ) : null}
            <div className="relative flex items-start justify-between gap-3">
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl transition ${
                  activeSection === "__all__"
                    ? "bg-white/15 backdrop-blur"
                    : "bg-gradient-to-br from-primary/20 to-primary-2/10 border border-primary/20"
                }`}
              >
                <Layers3 size={20} strokeWidth={2.1} className={activeSection === "__all__" ? "text-white" : "text-primary"} />
              </span>
              {hasAnyLowStock ? (
                <span
                  className={
                    activeSection === "__all__"
                      ? "rounded-full bg-white/20 px-2 py-0.5 text-[0.68rem] font-semibold text-primary-fg backdrop-blur"
                      : "status-pill pill-danger"
                  }
                >
                  alertas
                </span>
              ) : null}
            </div>
            <strong
              className={`relative mt-4 block font-display text-base font-semibold tracking-tight ${
                activeSection === "__all__" ? "text-primary-fg" : "text-fg"
              }`}
            >
              Todas seções
            </strong>
            <p
              className={`relative mt-1 text-[0.74rem] font-normal ${
                activeSection === "__all__" ? "text-primary-fg/72" : "text-muted"
              }`}
            >
              {rows.length} modelos · {totalAllVariants} variações
            </p>
            <p
              className={`relative mt-3 text-[0.92rem] font-semibold ${
                activeSection === "__all__" ? "text-accent" : "text-success"
              }`}
            >
              {totalAllStock} unidades
            </p>
          </button>

          {sections.map((section) => {
            const active = activeSection === section.name;

            return (
              <button
                key={section.name}
                type="button"
                onClick={() => setSelectedSection(section.name)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                  active
                    ? "border-primary/40 bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow"
                    : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
                }`}
              >
                {active ? (
                  <span className="absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,rgba(255,255,255,.15),transparent_60%)]" />
                ) : null}

                <div className="relative flex items-start justify-between gap-3">
                  <SectionIcon name={section.name} active={active} />
                  {section.lowStock ? (
                    <span
                      className={
                        active
                          ? "rounded-full bg-white/20 px-2 py-0.5 text-[0.68rem] font-semibold text-primary-fg backdrop-blur"
                          : "status-pill pill-danger"
                      }
                    >
                      crítico
                    </span>
                  ) : null}
                </div>
                <strong
                  className={`relative mt-4 block truncate font-display text-base font-semibold capitalize tracking-tight ${
                    active ? "text-primary-fg" : "text-fg"
                  }`}
                >
                  {section.name}
                </strong>
                <p
                  className={`relative mt-1 text-[0.74rem] font-normal ${
                    active ? "text-primary-fg/72" : "text-muted"
                  }`}
                >
                  {section.items.length} modelos · {section.variants} variações
                </p>
                <p
                  className={`relative mt-3 text-[0.92rem] font-semibold ${
                    active ? "text-accent" : "text-success"
                  }`}
                >
                  {section.stock} unidades
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold capitalize tracking-tight text-fg">
              {activeSection === "__all__" ? "Todos os produtos" : activeSection ?? "Produtos"}
            </h2>
            <p className="text-[0.86rem] font-normal text-muted">
              {activeProducts.length} {activeProducts.length === 1 ? "modelo" : "modelos"}
              {stockFilter === "low" ? " · com estoque baixo" : ""}
              {stockFilter === "out" ? " · sem estoque" : ""}
            </p>
          </div>
        </div>

        {activeProducts.length === 0 ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-2/30 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Search size={20} strokeWidth={2.1} />
            </span>
            <div>
              <p className="font-display text-base font-semibold tracking-tight text-fg">Nada encontrado</p>
              <p className="mt-1 text-[0.82rem] font-normal text-muted">
                Ajuste o filtro de seção, status ou termo de busca para ver mais modelos.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {activeProducts.map((product) => (
            <motion.button
              key={product.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              type="button"
              onClick={() => setSelectedProductId(product.id)}
              className="surface-card grid gap-4 p-4 text-left"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <ProductIcon product={product} />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-semibold tracking-tight text-fg">{product.name}</h3>
                    <p className="mt-0.5 truncate text-[0.74rem] font-normal text-muted">
                      {product.brand || "Sem marca"} · {product.gender || "Geral"}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    product.lowStock
                      ? "status-pill pill-danger shrink-0 whitespace-nowrap"
                      : "status-pill shrink-0 whitespace-nowrap"
                  }
                >
                  {product.totalStock} un.
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {product.tags.length ? (
                  product.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide ${tagColor(tag)}`}
                    >
                      <span className="opacity-60">#</span>{tag}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2/60 px-2.5 py-0.5 text-[0.7rem] font-medium text-muted">
                    sem tags
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {product.variants.slice(0, 5).map((variant) => (
                  <span
                    key={variant.id}
                    className="max-w-[7rem] truncate rounded-md border border-border bg-surface-2/60 px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted"
                  >
                    {variant.color}/{variant.size}
                  </span>
                ))}
                {!product.variants.length ? <span className="chip">sem variações</span> : null}
                {product.variants.length > 5 ? (
                  <span className="rounded-md bg-primary px-1.5 py-0.5 text-[0.7rem] font-semibold text-primary-fg">
                    +{product.variants.length - 5}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-surface-2/60 p-2.5">
                  <p className="text-[0.66rem] font-medium uppercase tracking-wide text-subtle">Variações</p>
                  <strong className="mt-1 block font-display text-base font-semibold tracking-tight text-fg">
                    {product.variants.length}
                  </strong>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-2.5">
                  <p className="text-[0.66rem] font-medium uppercase tracking-wide text-subtle">Tamanhos</p>
                  <strong className="mt-1 block font-display text-base font-semibold tracking-tight text-fg">
                    {new Set(product.variants.map((variant) => variant.size)).size || 0}
                  </strong>
                </div>
                <div className="rounded-xl bg-surface-2/60 p-2.5">
                  <p className="text-[0.66rem] font-medium uppercase tracking-wide text-subtle">Preço</p>
                  <strong className="mt-1 block truncate text-[0.84rem] font-semibold text-fg">
                    {product.minPrice ? money(product.minPrice) : "-"}
                  </strong>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedProduct ? (
          <motion.div
            className="fixed inset-0 z-40 grid place-items-center bg-fg/40 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProductId(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 0.9, 0.32, 1] }}
              className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-elevated shadow-elev"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-surface/60 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="hidden sm:block"><ProductIcon product={selectedProduct} size="sm" /></div>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-semibold tracking-tight text-fg sm:text-2xl">{selectedProduct.name}</h2>
                    <p className="mt-1 truncate text-[0.82rem] font-normal text-muted sm:text-[0.85rem]">
                      {selectedProduct.category} · {selectedProduct.brand || "Sem marca"} · {selectedProduct.gender || "Geral"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedProduct.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide ${tagColor(tag)}`}
                        >
                          <span className="opacity-60">#</span>{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form action={deleteProductAction} onSubmit={(e) => { if (!confirm("Excluir este produto e todas as suas variações?")) e.preventDefault(); }}>
                    <input type="hidden" name="id" value={selectedProduct.id} />
                    <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted transition hover:bg-danger-soft hover:text-danger" title="Excluir produto">
                      <Trash2 size={16} />
                    </button>
                  </form>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted transition hover:bg-danger-soft hover:text-danger"
                    onClick={() => { setSelectedProductId(null); setEditingVariantId(null); setAdjustingVariantId(null); }}
                    title="Fechar"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 overflow-y-auto xl:grid-cols-[1fr_340px] xl:overflow-hidden">
                <section className="grid content-start gap-4 overflow-y-auto p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-success-soft text-success">
                        <Boxes size={18} strokeWidth={2.1} />
                      </span>
                      <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-wide text-subtle">Estoque total</p>
                      <strong className="mt-1 block font-display text-2xl font-semibold tracking-tight text-fg">
                        {selectedProduct.totalStock}
                      </strong>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                        <PackagePlus size={18} strokeWidth={2.1} />
                      </span>
                      <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-wide text-subtle">Variações</p>
                      <strong className="mt-1 block font-display text-2xl font-semibold tracking-tight text-fg">
                        {selectedProduct.variants.length}
                      </strong>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-warning-soft text-warning">
                        <CircleDollarSign size={18} strokeWidth={2.1} />
                      </span>
                      <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-wide text-subtle">Faixa de preço</p>
                      <strong className="mt-1 block font-display text-base font-semibold tracking-tight text-fg">
                        {selectedProduct.minPrice
                          ? `${money(selectedProduct.minPrice)} – ${money(selectedProduct.maxPrice)}`
                          : "-"}
                      </strong>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <h3 className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">Variações do modelo</h3>
                    {selectedProduct.variants.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedProduct.variants.map((variant) => (
                          <div key={variant.id} className="rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/30 hover:shadow-soft">
                            {editingVariantId === variant.id ? (
                              <form action={updateVariantAction} onSubmit={() => setEditingVariantId(null)} className="grid gap-2">
                                <input type="hidden" name="id" value={variant.id} />
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="label text-[0.72rem]">SKU<input className="field h-7 py-1 text-xs" name="sku" defaultValue={variant.sku} required /></label>
                                  <label className="label text-[0.72rem]">Cor<input className="field h-7 py-1 text-xs" name="color" defaultValue={variant.color} required /></label>
                                  <label className="label text-[0.72rem]">Tam.<input className="field h-7 py-1 text-xs" name="size" defaultValue={variant.size} required /></label>
                                  <label className="label text-[0.72rem]">Mínimo<input className="field h-7 py-1 text-xs" name="minStock" type="number" min="0" defaultValue={variant.minStock} required /></label>
                                  <label className="label text-[0.72rem]">Custo<input className="field h-7 py-1 text-xs" name="costPrice" type="number" step="0.01" defaultValue={variant.costPrice} required /></label>
                                  <label className="label text-[0.72rem]">Venda<input className="field h-7 py-1 text-xs" name="salePrice" type="number" step="0.01" defaultValue={variant.salePrice} required /></label>
                                </div>
                                <div className="flex gap-2">
                                  <button type="submit" className="button-primary h-7 flex-1 px-2 py-0 text-xs">Salvar</button>
                                  <button type="button" onClick={() => setEditingVariantId(null)} className="h-7 flex-1 rounded-lg border border-border bg-surface-2 px-2 text-xs text-muted transition hover:text-fg">Cancelar</button>
                                </div>
                              </form>
                            ) : adjustingVariantId === variant.id ? (
                              <form action={adjustStockAction} onSubmit={() => setAdjustingVariantId(null)} className="grid gap-2">
                                <input type="hidden" name="variantId" value={variant.id} />
                                <p className="text-[0.76rem] font-semibold text-fg">Ajustar estoque</p>
                                <label className="label text-[0.72rem]">
                                  Tipo
                                  <select className="field h-7 py-0 text-xs" name="type">
                                    <option value="IN">Entrada</option>
                                    <option value="OUT">Saída</option>
                                    <option value="ADJUSTMENT">Ajuste</option>
                                  </select>
                                </label>
                                <label className="label text-[0.72rem]">
                                  Qtd.<input className="field h-7 py-1 text-xs" name="quantity" type="number" min="1" defaultValue="1" required />
                                </label>
                                <label className="label text-[0.72rem]">
                                  Motivo<input className="field h-7 py-1 text-xs" name="reason" placeholder="Ex: Recontagem, devolução" required />
                                </label>
                                <div className="flex gap-2">
                                  <button type="submit" className="button-primary h-7 flex-1 px-2 py-0 text-xs">Salvar</button>
                                  <button type="button" onClick={() => setAdjustingVariantId(null)} className="h-7 flex-1 rounded-lg border border-border bg-surface-2 px-2 text-xs text-muted transition hover:text-fg">Cancelar</button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex min-w-0 items-center justify-between gap-2">
                                  <strong className="min-w-0 truncate font-display text-[0.92rem] font-semibold tracking-tight text-fg">
                                    {variant.color} · {variant.size}
                                  </strong>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <span className={variant.stockQuantity <= variant.minStock ? "status-pill pill-danger shrink-0 whitespace-nowrap" : "status-pill shrink-0 whitespace-nowrap"}>
                                      {variant.stockQuantity} un.
                                    </span>
                                    <button type="button" onClick={() => { setAdjustingVariantId(variant.id); setEditingVariantId(null); }} className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-warning-soft hover:text-warning" title="Ajustar estoque">
                                      <ArrowDownUp size={13} />
                                    </button>
                                    <button type="button" onClick={() => { setEditingVariantId(variant.id); setAdjustingVariantId(null); }} className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-primary-soft hover:text-primary" title="Editar variação">
                                      <Pencil size={13} />
                                    </button>
                                    <form action={deleteVariantAction} onSubmit={(e) => { if (!confirm("Excluir esta variação?")) e.preventDefault(); }}>
                                      <input type="hidden" name="id" value={variant.id} />
                                      <button type="submit" className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger" title="Excluir variação">
                                        <Trash2 size={13} />
                                      </button>
                                    </form>
                                  </div>
                                </div>
                                <p className="mt-2 text-[0.74rem] font-normal text-muted">{variant.sku}</p>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-[0.74rem] font-normal text-muted">
                                  <span>Custo: <b className="text-fg">{money(variant.costPrice)}</b></span>
                                  <span>Venda: <b className="text-fg">{money(variant.salePrice)}</b></span>
                                  <span>Mínimo: <b className="text-fg">{variant.minStock}</b></span>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-6 text-[0.86rem] font-normal text-muted">
                        Nenhuma variação cadastrada. Adicione cor, tamanho, SKU e estoque no formulário ao lado.
                      </div>
                    )}
                  </div>
                </section>

                <form
                  action={createVariantAction}
                  className="grid content-start gap-3 overflow-y-auto border-t border-border bg-surface-2/30 p-5 xl:border-l xl:border-t-0"
                >
                  <input type="hidden" name="productId" value={selectedProduct.id} />
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
                      <Plus size={17} strokeWidth={2.4} />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold tracking-tight text-fg">Nova variação</h3>
                      <p className="text-[0.74rem] font-normal text-muted">Cor, tamanho, SKU, custo, preço e estoque.</p>
                    </div>
                  </div>
                  <label className="label">
                    SKU<input className="field" name="sku" required />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="label">
                      Cor<input className="field" name="color" required />
                    </label>
                    <label className="label">
                      Tam.<input className="field" name="size" required />
                    </label>
                    <label className="label">
                      Estoque
                      <input className="field" name="stockQuantity" type="number" min="0" defaultValue="0" required />
                    </label>
                    <label className="label">
                      Mínimo
                      <input className="field" name="minStock" type="number" min="0" defaultValue="2" required />
                    </label>
                    <label className="label">
                      Custo
                      <input className="field" name="costPrice" type="number" min="0" step="0.01" required />
                    </label>
                    <label className="label">
                      Venda
                      <input className="field" name="salePrice" type="number" min="0" step="0.01" required />
                    </label>
                  </div>
                  <button className="button-primary mt-2">Adicionar variação</button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
