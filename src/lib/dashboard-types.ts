import type { getDashboardData } from "./dashboard";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export type WidgetId =
  | "metric-balance"
  | "metric-sales"
  | "metric-revenue"
  | "metric-profit"
  | "chart-sales"
  | "recent-orders"
  | "low-stock"
  | "customers";

export interface WidgetLayoutItem {
  i: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  visible: boolean;
}

export const WIDGET_LABELS: Record<WidgetId, string> = {
  "metric-balance": "Saldo em caixa",
  "metric-sales": "Vendas do mês",
  "metric-revenue": "Receitas do mês",
  "metric-profit": "Lucro estimado",
  "chart-sales": "Gráfico de vendas",
  "recent-orders": "Pedidos recentes",
  "low-stock": "Estoque crítico",
  "customers": "Total de clientes"
};

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: "metric-balance",  x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, visible: true },
  { i: "metric-sales",    x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, visible: true },
  { i: "metric-revenue",  x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, visible: true },
  { i: "metric-profit",   x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2, visible: true },
  { i: "chart-sales",     x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3, visible: true },
  { i: "customers",       x: 8, y: 2, w: 4, h: 4, minW: 2, minH: 2, visible: true },
  { i: "recent-orders",   x: 0, y: 6, w: 8, h: 4, minW: 4, minH: 3, visible: true },
  { i: "low-stock",       x: 8, y: 6, w: 4, h: 4, minW: 2, minH: 3, visible: true },
];
