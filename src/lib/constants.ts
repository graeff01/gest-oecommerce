export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  PAID: "Pago",
  PICKING: "Separando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado"
};

export const ORDER_STATUS_TONES: Record<string, string> = {
  NEW: "status-pill pill-info",
  PAID: "status-pill",
  PICKING: "status-pill pill-warning",
  SHIPPED: "status-pill pill-primary",
  DELIVERED: "status-pill",
  CANCELED: "status-pill pill-danger"
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão crédito",
  DEBIT_CARD: "Cartão débito",
  CASH: "Dinheiro",
  BANK_SLIP: "Boleto",
  MARKETPLACE: "Marketplace",
  CREDIARIO: "Crediário"
};

export const PAYMENT_METHODS = [
  { value: "PIX", label: "Pix" },
  { value: "CREDIT_CARD", label: "Cartão crédito" },
  { value: "DEBIT_CARD", label: "Cartão débito" },
  { value: "CASH", label: "Dinheiro" },
  { value: "BANK_SLIP", label: "Boleto" },
  { value: "MARKETPLACE", label: "Marketplace" }
] as const;

export const PAYMENT_METHODS_WITH_CREDIARIO = [
  ...PAYMENT_METHODS,
  { value: "CREDIARIO", label: "Crediário" }
] as const;

export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  FINANCE: "Financeiro",
  STOCK: "Estoque",
  SALES: "Vendas"
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  REVENUE: "Receita",
  EXPENSE: "Gasto"
};
