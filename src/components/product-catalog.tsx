"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Filter,
  Footprints,
  Layers3,
  PackagePlus,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  Tag,
  X
} from "lucide-react";
import { money } from "@/lib/format";
import { createVariantAction } from "@/app/(app)/actions";

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

function iconFor(value: string) {
  const name = value.toLowerCase();
  if (name.includes("tenis") || name.includes("calc") || name.includes("sapato")) return Footprints;
  if (name.includes("roup") || name.includes("camis") || name.includes("vest")) return Shirt;
  if (name.includes("premium") || name.includes("casual")) return ShoppingBag;
  return Tag;
}

function ProductIcon({ product }: { product: CatalogProduct }) {
  const Icon = iconFor(product.category || product.tags[0] || product.name);

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
      <Icon size={21} strokeWidth={2.1} />
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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-fg">Seções e tags</h2>
            <p className="text-[0.86rem] font-normal text-muted">Filtre por seção, status de estoque ou busque diretamente.</p>
          </div>
          <div className="flex flex-col gap-2 xl:w-[560px] xl:flex-row">
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
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
                    ? "bg-white/15 text-primary-fg backdrop-blur"
                    : "bg-primary-soft text-primary"
                }`}
              >
                <Layers3 size={20} strokeWidth={2.1} />
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
            const Icon = iconFor(section.name);
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
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl transition ${
                      active ? "bg-white/15 text-primary-fg backdrop-blur" : "bg-primary-soft text-primary"
                    }`}
                  >
                    <Icon size={20} strokeWidth={2.1} />
                  </span>
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
                  className={`relative mt-4 block font-display text-base font-semibold capitalize tracking-tight ${
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <ProductIcon product={product} />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-semibold tracking-tight text-fg">{product.name}</h3>
                    <p className="mt-0.5 text-[0.74rem] font-normal text-muted">
                      {product.brand || "Sem marca"} · {product.gender || "Geral"}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    product.lowStock
                      ? "status-pill pill-danger"
                      : "status-pill"
                  }
                >
                  {product.totalStock} un.
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {product.tags.length ? (
                  product.tags.slice(0, 4).map((item) => (
                    <span key={item} className="chip">
                      #{item}
                    </span>
                  ))
                ) : (
                  <span className="chip">sem tags</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {product.variants.slice(0, 5).map((variant) => (
                  <span
                    key={variant.id}
                    className="rounded-md border border-border bg-surface-2/60 px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted"
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
              className="max-h-[92dvh] w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-elevated shadow-elev"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border bg-surface/60 p-5">
                <div className="flex items-start gap-4">
                  <ProductIcon product={selectedProduct} />
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">{selectedProduct.name}</h2>
                    <p className="mt-1 text-[0.85rem] font-normal text-muted">
                      {selectedProduct.category} · {selectedProduct.brand || "Sem marca"} · {selectedProduct.gender || "Geral"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedProduct.tags.map((item) => (
                        <span key={item} className="chip">
                          #{item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted transition hover:bg-danger-soft hover:text-danger"
                  onClick={() => setSelectedProductId(null)}
                  title="Fechar"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid max-h-[calc(92dvh-110px)] gap-0 overflow-y-auto xl:grid-cols-[1fr_380px]">
                <section className="grid content-start gap-4 p-5">
                  <div className="grid gap-3 md:grid-cols-3">
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
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {selectedProduct.variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/30 hover:shadow-soft"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong className="font-display text-[0.92rem] font-semibold tracking-tight text-fg">
                                {variant.color} · {variant.size}
                              </strong>
                              <span
                                className={
                                  variant.stockQuantity <= variant.minStock
                                    ? "status-pill pill-danger"
                                    : "status-pill"
                                }
                              >
                                {variant.stockQuantity} un.
                              </span>
                            </div>
                            <p className="mt-2 text-[0.74rem] font-normal text-muted">{variant.sku}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-[0.74rem] font-normal text-muted">
                              <span>
                                Custo: <b className="text-fg">{money(variant.costPrice)}</b>
                              </span>
                              <span>
                                Venda: <b className="text-fg">{money(variant.salePrice)}</b>
                              </span>
                              <span>
                                Mínimo: <b className="text-fg">{variant.minStock}</b>
                              </span>
                            </div>
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
                  className="grid content-start gap-3 border-t border-border bg-surface-2/30 p-5 xl:border-l xl:border-t-0"
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
