"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  GripVertical,
  LayoutDashboard,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  UsersRound,
  Wallet,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import GridLayout from "react-grid-layout";
// The @types/react-grid-layout package has a known issue where ReactGridLayoutProps
// is not exported directly, causing false TS errors on props like `cols`. We cast below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Grid = GridLayout as any;
import { saveDashboardLayoutAction } from "@/app/(app)/actions/dashboard";
import { MetricCard } from "@/components/metric-card";
import { SalesChart } from "@/components/sales-chart";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { DashboardData, WidgetId, WidgetLayoutItem } from "@/lib/dashboard-types";
import { DEFAULT_LAYOUT, WIDGET_LABELS } from "@/lib/dashboard-types";
import { money } from "@/lib/format";


type Props = {
  data: DashboardData;
  savedLayout: WidgetLayoutItem[] | null;
};

function mergeWithDefaults(saved: WidgetLayoutItem[] | null): WidgetLayoutItem[] {
  if (!saved || saved.length === 0) return DEFAULT_LAYOUT;
  // keep all default widgets; saved overrides position/size/visibility
  return DEFAULT_LAYOUT.map((def) => {
    const found = saved.find((s) => s.i === def.i);
    return found ? { ...def, ...found } : def;
  });
}

function WidgetShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      {children}
    </div>
  );
}

function WidgetMetricBalance({ data }: { data: DashboardData }) {
  return (
    <MetricCard
      label="Saldo em caixa"
      value={money(data.metrics.currentBalance)}
      detail={data.metrics.currentBalance >= 0 ? "Caixa positivo" : "Caixa negativo"}
      icon={Wallet}
      tone={data.metrics.currentBalance >= 0 ? "success" : "danger"}
    />
  );
}

function WidgetMetricSales({ data }: { data: DashboardData }) {
  return (
    <MetricCard
      label="Vendas do mês"
      value={money(data.metrics.salesTotal)}
      detail="Pedidos pagos e ativos"
      icon={ReceiptText}
      tone="primary"
    />
  );
}

function WidgetMetricRevenue({ data }: { data: DashboardData }) {
  return (
    <MetricCard
      label="Receitas do mês"
      value={money(data.metrics.revenue)}
      detail="Entradas financeiras"
      icon={CircleDollarSign}
      tone="success"
    />
  );
}

function WidgetMetricProfit({ data }: { data: DashboardData }) {
  return (
    <MetricCard
      label="Lucro estimado"
      value={money(data.metrics.profit)}
      detail="Venda menos custo e despesas"
      icon={TrendingUp}
      tone="warning"
    />
  );
}

function WidgetChartSales({ data }: { data: DashboardData }) {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="eyebrow">Performance</p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Vendas recentes</h2>
          <p className="text-[0.78rem] font-normal text-muted">Últimos 7 dias</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Activity size={17} strokeWidth={2.1} />
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <SalesChart data={data.chart} compact />
      </div>
    </div>
  );
}

function WidgetRecentOrders({ data }: { data: DashboardData }) {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-3">
        <p className="eyebrow">Últimos</p>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Pedidos recentes</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Status</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.length ? (
              data.recentOrders.slice(0, 5).map((order) => (
                <tr key={order.id}>
                  <td className="font-semibold text-fg">{order.code}</td>
                  <td className="max-w-[10rem] truncate">{order.customer?.name ?? "Avulsa"}</td>
                  <td><span className="status-pill">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span></td>
                  <td className="whitespace-nowrap text-right font-semibold text-fg">{money(order.total)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="py-8 text-center text-muted">Nenhum pedido ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WidgetLowStock({ data }: { data: DashboardData }) {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="eyebrow">Atenção</p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Reposição</h2>
          <p className="text-[0.78rem] font-normal text-muted">Itens críticos</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-danger-soft text-danger">
          <AlertTriangle size={17} strokeWidth={2.1} />
        </span>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-auto">
        {data.lowStock.length ? (
          data.lowStock.slice(0, 8).map((variant) => (
            <div
              key={variant.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2/50 p-3"
            >
              <div className="min-w-0">
                <strong className="block truncate text-[0.85rem] font-semibold text-fg">{variant.product.name}</strong>
                <p className="mt-0.5 truncate text-[0.72rem] text-muted">{variant.color} · {variant.size} · {variant.sku}</p>
              </div>
              <span className="status-pill pill-danger shrink-0">{variant.stockQuantity} un.</span>
            </div>
          ))
        ) : (
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2/40 p-6 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-success-soft text-success">
              <ArrowUpRight size={18} />
            </span>
            <p className="text-[0.85rem] font-medium text-fg">Estoque saudável</p>
            <p className="text-[0.74rem] text-muted">Nenhum alerta agora.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WidgetCustomers({ data }: { data: DashboardData }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden p-5">
      <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-success/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="eyebrow">Base</p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Clientes</h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-success-soft text-success">
          <UsersRound size={17} strokeWidth={2.1} />
        </span>
      </div>
      <strong className="relative mt-5 block font-display text-[3rem] font-bold leading-none tracking-tight text-fg">
        {data.metrics.customers}
      </strong>
      <p className="relative mt-2 text-[0.78rem] text-muted">
        Use o histórico para campanhas de recompra.
      </p>
    </div>
  );
}

function renderWidget(id: WidgetId, data: DashboardData) {
  switch (id) {
    case "metric-balance":  return <WidgetMetricBalance data={data} />;
    case "metric-sales":    return <WidgetMetricSales data={data} />;
    case "metric-revenue":  return <WidgetMetricRevenue data={data} />;
    case "metric-profit":   return <WidgetMetricProfit data={data} />;
    case "chart-sales":     return <WidgetChartSales data={data} />;
    case "recent-orders":   return <WidgetRecentOrders data={data} />;
    case "low-stock":       return <WidgetLowStock data={data} />;
    case "customers":       return <WidgetCustomers data={data} />;
  }
}

export function DashboardGrid({ data, savedLayout }: Props) {
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(() => mergeWithDefaults(savedLayout));
  const [editing, setEditing] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [saving, startSave] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // measure container width for responsive grid
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => obs.disconnect();
  }, []);

  const visibleLayout = layout.filter((w) => w.visible !== false);

  const glLayout = visibleLayout.map((w) => ({
    i: w.i,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: w.minW ?? 2,
    minH: w.minH ?? 2,
    isDraggable: editing,
    isResizable: editing
  }));

  const handleLayoutChange = useCallback((newGl: { i: string; x: number; y: number; w: number; h: number }[]) => {
    setLayout((prev) => prev.map((item) => {
      const updated = newGl.find((g) => g.i === item.i);
      if (!updated) return item;
      return { ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVisibility = (id: WidgetId) => {
    setLayout((prev) => prev.map((w) => w.i === id ? { ...w, visible: !w.visible } : w));
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
  };

  const save = () => {
    startSave(async () => {
      await saveDashboardLayoutAction(layout);
      setEditing(false);
      setConfigOpen(false);
    });
  };

  const ROW_HEIGHT = 60;
  const COLS = 12;
  const MARGIN: [number, number] = [12, 12];

  return (
    <div className="grid gap-4">
      {/* toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-fg">Dashboard</h1>
          <p className="mt-1 text-[0.82rem] text-muted">
            Vendas, caixa, margem e alertas principais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <>
              <button
                onClick={resetLayout}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:text-fg"
              >
                <RotateCcw size={14} /> Resetar
              </button>
              <button
                onClick={() => setConfigOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:text-fg"
              >
                <EyeOff size={14} /> Widgets
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="button-primary px-4 py-2 text-sm"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => { setLayout(mergeWithDefaults(savedLayout)); setEditing(false); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:text-danger"
              >
                <X size={16} />
              </button>
            </>
          )}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted transition hover:text-fg"
            >
              <LayoutDashboard size={14} /> Personalizar
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary-soft px-4 py-2.5 text-sm text-primary">
          <GripVertical size={14} className="shrink-0" />
          Arraste os widgets para reposicionar e puxe as bordas para redimensionar.
        </div>
      )}

      {/* grid */}
      <div ref={containerRef} className="relative">
        <Grid
          layout={glLayout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={containerWidth}
          margin={MARGIN}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          isDraggable={editing}
          isResizable={editing}
          draggableHandle=".drag-handle"
          resizeHandles={["se", "sw", "ne", "nw", "e", "w", "n", "s"]}
          className="relative"
        >
          {visibleLayout.map((widget) => (
            <div key={widget.i} className="group relative">
              {/* drag handle overlay when editing */}
              {editing && (
                <div className="drag-handle absolute inset-0 z-10 cursor-grab rounded-2xl ring-2 ring-primary/40 ring-offset-1 active:cursor-grabbing" />
              )}
              <WidgetShell label={WIDGET_LABELS[widget.i]}>
                {renderWidget(widget.i, data)}
              </WidgetShell>
              {editing && (
                <button
                  onClick={() => toggleVisibility(widget.i)}
                  className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-surface/90 text-muted shadow-soft backdrop-blur-sm transition hover:text-danger"
                  title="Ocultar widget"
                >
                  <EyeOff size={13} />
                </button>
              )}
            </div>
          ))}
        </Grid>
      </div>

      {/* config modal: visibility */}
      {configOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfigOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-elev">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-fg">Widgets visíveis</h2>
                <p className="mt-0.5 text-[0.78rem] text-muted">Ative ou desative cada bloco do dashboard.</p>
              </div>
              <button
                onClick={() => setConfigOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-xl border border-border text-muted hover:text-fg"
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid gap-2">
              {layout.map((widget) => (
                <button
                  key={widget.i}
                  onClick={() => toggleVisibility(widget.i)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    widget.visible !== false
                      ? "border-primary/20 bg-primary-soft text-fg"
                      : "border-border bg-surface-2/40 text-muted"
                  }`}
                >
                  <span className="text-[0.88rem] font-medium">{WIDGET_LABELS[widget.i]}</span>
                  {widget.visible !== false ? (
                    <Eye size={15} className="shrink-0 text-primary" />
                  ) : (
                    <EyeOff size={15} className="shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="button-primary mt-5 w-full py-2.5"
            >
              {saving ? "Salvando..." : "Salvar configuração"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
