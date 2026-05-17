"use client";

import { AlertTriangle, Flame, MessageCircle, PackageCheck, Repeat2, TrendingUp } from "lucide-react";
import { money } from "@/lib/format";
import { whatsappShareUrl } from "@/lib/whatsapp";

export type StagnantProduct = {
  id: string;
  name: string;
  category: string;
  stock: number;
  minPrice: number | null;
  daysWithoutSale: number | null;
  bucket: 30 | 60 | 90;
  suggestion: string;
  message: string;
};

export type ReorderProduct = {
  id: string;
  name: string;
  stock: number;
  sold30: number;
  sold90: number;
  lowStockSkus: number;
  suggestedQty: number;
  priority: "high" | "medium" | "low";
};

function priorityLabel(priority: ReorderProduct["priority"]) {
  if (priority === "high") return "Alta";
  if (priority === "medium") return "Media";
  return "Baixa";
}

function bucketLabel(product: StagnantProduct) {
  if (product.daysWithoutSale === null) return `Sem venda registrada`;
  return `${product.daysWithoutSale} dias sem venda`;
}

export function ProductGrowthKit({
  stagnantProducts,
  reorderProducts,
  bestSellers
}: {
  stagnantProducts: StagnantProduct[];
  reorderProducts: ReorderProduct[];
  bestSellers: ReorderProduct[];
}) {
  const firstStagnant = stagnantProducts[0];

  return (
    <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
      <div className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
              <Flame size={19} strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">Produtos parados</p>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Estoque que precisa girar</h2>
              <p className="mt-1 text-[0.8rem] text-muted">Lista automatica por 30, 60 e 90 dias sem venda.</p>
            </div>
          </div>
          {firstStagnant ? (
            <a
              href={whatsappShareUrl(firstStagnant.message)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-success/25 bg-success-soft px-3 text-[0.78rem] font-semibold text-success transition hover:bg-success hover:text-primary-fg"
            >
              <MessageCircle size={14} />
              Divulgar destaque
            </a>
          ) : null}
        </div>

        <div className="grid gap-3 p-5">
          {stagnantProducts.length ? (
            stagnantProducts.slice(0, 6).map((product) => (
              <div key={product.id} className="grid gap-3 rounded-xl border border-border bg-surface-2/35 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate font-display text-base font-semibold text-fg">{product.name}</strong>
                    <span className={`status-pill ${product.bucket >= 90 ? "pill-danger" : product.bucket >= 60 ? "pill-warning" : ""}`}>
                      {product.bucket}+ dias
                    </span>
                    <span className="chip">{product.category}</span>
                  </div>
                  <p className="mt-2 text-[0.82rem] text-muted">{bucketLabel(product)} · {product.suggestion}</p>
                  <p className="mt-1 text-[0.76rem] text-subtle">
                    Estoque: {product.stock} unidade{product.stock === 1 ? "" : "s"}
                    {product.minPrice !== null ? ` · menor preco ${money(product.minPrice)}` : ""}
                  </p>
                </div>
                <a
                  href={whatsappShareUrl(product.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-[0.78rem] font-semibold text-muted transition hover:border-success/40 hover:text-success"
                >
                  <MessageCircle size={14} />
                  Mensagem
                </a>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface-2/35 p-6 text-center">
              <PackageCheck className="mx-auto text-success" size={24} />
              <p className="mt-3 font-semibold text-fg">Nenhum produto parado agora.</p>
              <p className="mt-1 text-[0.82rem] text-muted">Quando algum item ficar 30 dias sem vender, ele aparece aqui.</p>
            </div>
          )}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-border p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <Repeat2 size={19} strokeWidth={2.1} />
            </span>
            <div>
              <p className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">Reposicao inteligente</p>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Comprar pelo giro, nao no chute</h2>
              <p className="mt-1 text-[0.8rem] text-muted">Sugestao baseada em venda dos ultimos 30 dias e estoque atual.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5">
          {bestSellers.length ? (
            <div className="rounded-xl border border-success/20 bg-success-soft/35 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-success" />
                <p className="text-[0.76rem] font-semibold uppercase tracking-wide text-success">Mais vendido agora</p>
              </div>
              <p className="mt-2 font-display text-lg font-semibold text-fg">{bestSellers[0].name}</p>
              <p className="mt-1 text-[0.8rem] text-muted">
                {bestSellers[0].sold30} venda{bestSellers[0].sold30 === 1 ? "" : "s"} em 30 dias · estoque {bestSellers[0].stock}
              </p>
            </div>
          ) : null}

          {reorderProducts.length ? (
            reorderProducts.slice(0, 7).map((product) => (
              <div key={product.id} className="grid gap-3 rounded-xl border border-border bg-surface-2/35 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate font-semibold text-fg">{product.name}</strong>
                    <span className={product.priority === "high" ? "status-pill pill-danger" : "chip"}>
                      {priorityLabel(product.priority)}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.78rem] text-muted">
                    Vendeu {product.sold30} em 30d · estoque {product.stock} · {product.lowStockSkus} SKU{product.lowStockSkus === 1 ? "" : "s"} baixo
                  </p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary-soft px-3 py-2 text-center">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-primary">Repor</p>
                  <p className="font-display text-lg font-semibold text-fg">{product.suggestedQty}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface-2/35 p-6 text-center">
              <AlertTriangle className="mx-auto text-muted" size={24} />
              <p className="mt-3 font-semibold text-fg">Sem reposicao urgente.</p>
              <p className="mt-1 text-[0.82rem] text-muted">Quando um produto vender bem e ficar baixo, a sugestao aparece aqui.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
