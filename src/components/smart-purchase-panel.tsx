import { AlertTriangle, CheckCircle2, PauseCircle, TrendingUp } from "lucide-react";

export type SmartPurchaseItem = {
  variantId: string;
  productName: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  minStock: number;
  sold30: number;
  suggestedQty: number;
  status: "buy" | "watch" | "avoid";
};

export function SmartPurchasePanel({ items }: { items: SmartPurchaseItem[] }) {
  const buy = items.filter((item) => item.status === "buy").slice(0, 5);
  const avoid = items.filter((item) => item.status === "avoid").slice(0, 4);
  const watch = items.filter((item) => item.status === "watch").slice(0, 4);

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-border p-5">
        <p className="eyebrow">Compra inteligente</p>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Comprar pelo giro, nao pela ansiedade</h2>
        <p className="mt-1 text-[0.8rem] text-muted">Sugestoes baseadas em estoque minimo e vendas dos ultimos 30 dias.</p>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-3 xl:p-5">
        <div className="grid content-start gap-3">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 size={16} />
            <p className="text-[0.76rem] font-semibold uppercase tracking-wide">Comprar agora</p>
          </div>
          {buy.length ? buy.map((item) => (
            <div key={item.variantId} className="rounded-xl border border-success/20 bg-success-soft/35 p-4">
              <p className="truncate font-semibold text-fg">{item.productName}</p>
              <p className="mt-1 text-[0.76rem] text-muted">{item.color}/{item.size} · {item.sku}</p>
              <p className="mt-2 text-[0.82rem] font-semibold text-success">Repor {item.suggestedQty} un.</p>
              <p className="mt-1 text-[0.72rem] text-muted">Estoque {item.stock}, minimo {item.minStock}, vendeu {item.sold30}</p>
            </div>
          )) : <p className="rounded-xl border border-dashed border-border p-4 text-[0.82rem] text-muted">Sem compra urgente.</p>}
        </div>

        <div className="grid content-start gap-3">
          <div className="flex items-center gap-2 text-warning">
            <TrendingUp size={16} />
            <p className="text-[0.76rem] font-semibold uppercase tracking-wide">Observar</p>
          </div>
          {watch.length ? watch.map((item) => (
            <div key={item.variantId} className="rounded-xl border border-warning/20 bg-warning-soft/35 p-4">
              <p className="truncate font-semibold text-fg">{item.productName}</p>
              <p className="mt-1 text-[0.76rem] text-muted">{item.color}/{item.size} · estoque {item.stock}</p>
              <p className="mt-2 text-[0.78rem] font-semibold text-warning">Vendeu {item.sold30} em 30 dias</p>
            </div>
          )) : <p className="rounded-xl border border-dashed border-border p-4 text-[0.82rem] text-muted">Nada em observacao.</p>}
        </div>

        <div className="grid content-start gap-3">
          <div className="flex items-center gap-2 text-danger">
            <PauseCircle size={16} />
            <p className="text-[0.76rem] font-semibold uppercase tracking-wide">Nao comprar agora</p>
          </div>
          {avoid.length ? avoid.map((item) => (
            <div key={item.variantId} className="rounded-xl border border-danger/20 bg-danger-soft/35 p-4">
              <p className="truncate font-semibold text-fg">{item.productName}</p>
              <p className="mt-1 text-[0.76rem] text-muted">{item.color}/{item.size} · estoque {item.stock}</p>
              <p className="mt-2 flex items-center gap-1 text-[0.78rem] font-semibold text-danger">
                <AlertTriangle size={13} />
                Sem giro recente
              </p>
            </div>
          )) : <p className="rounded-xl border border-dashed border-border p-4 text-[0.82rem] text-muted">Nenhum bloqueio sugerido.</p>}
        </div>
      </div>
    </section>
  );
}
