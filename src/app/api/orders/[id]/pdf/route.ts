import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function fmt(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão crédito",
  DEBIT_CARD: "Cartão débito",
  CASH: "Dinheiro",
  BANK_SLIP: "Boleto",
  MARKETPLACE: "Marketplace",
  CREDIARIO: "Crediário"
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  PAID: "Pago",
  PICKING: "Separando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado"
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { variant: { include: { product: true } } } },
        installments: { orderBy: { sequence: "asc" } }
      }
    }),
    prisma.storeSettings.findFirst()
  ]);

  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const storeName = settings?.storeName ?? "Loja";
  const storeTagline = settings?.storeTagline ?? "";

  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const fee = Number(order.fee);
  const total = Number(order.total);

  const itemsHtml = order.items
    .map((item) => {
      const name = item.variant
        ? `${item.variant.product.name} — ${item.variant.color} / ${item.variant.size}`
        : (item.label ?? "Item avulso");
      const unitPrice = Number(item.unitPrice);
      return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${fmt(unitPrice)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${fmt(unitPrice * item.quantity)}</td>
      </tr>`;
    })
    .join("");

  const installmentsHtml =
    order.installments.length > 0
      ? `
    <div style="margin-top:20px;">
      <h3 style="font-size:13px;font-weight:700;margin:0 0 8px;color:#333;text-transform:uppercase;letter-spacing:.05em;">Parcelas do Crediário</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:6px 8px;text-align:left;">Parcela</th>
            <th style="padding:6px 8px;text-align:left;">Vencimento</th>
            <th style="padding:6px 8px;text-align:right;">Valor</th>
            <th style="padding:6px 8px;text-align:center;">Situação</th>
          </tr>
        </thead>
        <tbody>
          ${order.installments
            .map(
              (inst) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;">${inst.sequence}/${inst.totalCount}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;">${fmtDate(inst.dueDate)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${fmt(Number(inst.amount))}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${inst.paidAt ? "✓ Paga" : "Em aberto"}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recibo ${order.code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #222;
      background: #fff;
      padding: 32px;
      max-width: 680px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 20px; }
    .store-name { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
    .store-tagline { font-size: 12px; color: #666; margin-top: 2px; }
    .receipt-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-top: 10px; color: #555; }
    .order-code { font-size: 18px; font-weight: 700; margin-top: 2px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .meta-box { background: #f9f9f9; border-radius: 8px; padding: 10px 12px; }
    .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 3px; }
    .meta-value { font-size: 13px; font-weight: 600; color: #222; }
    .meta-sub { font-size: 11px; color: #666; margin-top: 1px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #f3f3f3; }
    th { padding: 7px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #555; }
    .totals { margin-top: 16px; border-top: 1px solid #ddd; padding-top: 12px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
    .totals-row.total { border-top: 2px solid #222; margin-top: 8px; padding-top: 8px; font-size: 16px; font-weight: 800; }
    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 14px; }
    .print-btn {
      display: block;
      margin: 0 auto 24px;
      padding: 10px 28px;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Imprimir / Salvar PDF</button>

  <div class="header">
    <div class="store-name">${storeName}</div>
    ${storeTagline ? `<div class="store-tagline">${storeTagline}</div>` : ""}
    <div class="receipt-title">Recibo de Pedido</div>
    <div class="order-code">${order.code}</div>
  </div>

  <div class="meta">
    <div class="meta-box">
      <div class="meta-label">Data</div>
      <div class="meta-value">${fmtDate(order.createdAt)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Status</div>
      <div class="meta-value">${STATUS_LABELS[order.status] ?? order.status}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Cliente</div>
      <div class="meta-value">${order.customer?.name ?? "Venda avulsa"}</div>
      ${order.customer?.phone ? `<div class="meta-sub">${order.customer.phone}</div>` : ""}
    </div>
    <div class="meta-box">
      <div class="meta-label">Pagamento</div>
      <div class="meta-value">${PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</div>
      <div class="meta-sub">${order.channel}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Produto</th>
        <th style="text-align:center;">Qtd.</th>
        <th style="text-align:right;">Unit.</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    ${discount > 0 ? `<div class="totals-row"><span>Desconto</span><span style="color:#22863a;">− ${fmt(discount)}</span></div>` : ""}
    ${fee > 0 ? `<div class="totals-row"><span>Taxa</span><span style="color:#b45309;">+ ${fmt(fee)}</span></div>` : ""}
    <div class="totals-row total"><span>Total</span><span>${fmt(total)}</span></div>
  </div>

  ${installmentsHtml}

  ${order.notes ? `<div style="margin-top:20px;background:#f9f9f9;border-radius:8px;padding:12px;font-size:12px;color:#555;"><strong>Obs:</strong> ${order.notes}</div>` : ""}

  <div class="footer">Documento gerado em ${fmtDate(new Date())} · ${storeName}</div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
