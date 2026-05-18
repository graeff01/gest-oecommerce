import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartao credito",
  DEBIT_CARD: "Cartao debito",
  CASH: "Dinheiro",
  BANK_SLIP: "Boleto",
  MARKETPLACE: "Marketplace",
  CREDIARIO: "Crediario"
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (!order) return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SALES", "FINANCE"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storeNameRaw = settings?.storeName ?? "Loja";
  const storeTaglineRaw = settings?.storeTagline ?? "";
  const storeName = escapeHtml(storeNameRaw);
  const storeTagline = escapeHtml(storeTaglineRaw);
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const fee = Number(order.fee);
  const total = Number(order.total);
  if (req.nextUrl.searchParams.get("download") === "1") {
    const compactWidth = 420;
    const estimatedHeight = 430 + order.items.length * 34 + order.installments.length * 26 + (order.notes ? 52 : 0);
    const doc = new PDFDocument({ size: [compactWidth, Math.max(620, estimatedHeight)], margin: 24 });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve) => {
      doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const pageWidth = doc.page.width;
    const margin = 24;
    const contentWidth = pageWidth - margin * 2;
    const purple = "#7b61ff";
    const ink = "#18171f";
    const muted = "#6f675b";
    const line = "#e6dfd2";
    const soft = "#faf7f0";

    function ensureSpace(height: number) {
      if (doc.y + height <= doc.page.height - margin) return;
      doc.addPage();
    }

    function label(text: string, x: number, y: number, width: number) {
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#8b7f6b").text(text.toUpperCase(), x, y, {
        width,
        characterSpacing: 0.4
      });
    }

    function infoBox(title: string, value: string, sub: string | null, x: number, y: number, width: number) {
      doc.roundedRect(x, y, width, 58, 8).fillAndStroke(soft, line);
      label(title, x + 10, y + 9, width - 20);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text(value, x + 10, y + 24, {
        width: width - 20,
        height: 14,
        ellipsis: true
      });
      if (sub) {
        doc.font("Helvetica").fontSize(8).fillColor(muted).text(sub, x + 10, y + 39, {
          width: width - 20,
          height: 10,
          ellipsis: true
        });
      }
    }

    function tableHeader(y: number) {
      doc.roundedRect(margin, y, contentWidth, 24, 6).fill("#f2eee5");
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#746955");
      doc.text("Produto", margin + 10, y + 8, { width: 170 });
      doc.text("Qtd.", margin + 190, y + 8, { width: 32, align: "center" });
      doc.text("Unit.", margin + 232, y + 8, { width: 62, align: "right" });
      doc.text("Total", margin + 304, y + 8, { width: 58, align: "right" });
    }

    doc.rect(0, 0, pageWidth, 106).fill(ink);
    doc.rect(pageWidth - 130, 0, 130, 106).fill(purple);
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#c9c2ff").text("COMPROVANTE DE VENDA", margin, 23);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#ffffff").text(storeNameRaw, margin, 38, { width: 230 });
    if (storeTaglineRaw) doc.font("Helvetica").fontSize(8).fillColor("#ded9ff").text(storeTaglineRaw, margin, 63, { width: 230 });
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#ded9ff").text("PEDIDO", pageWidth - 118, 25, { width: 90, align: "right" });
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#ffffff").text(order.code, pageWidth - 128, 40, { width: 100, align: "right" });
    doc.roundedRect(pageWidth - 86, 66, 58, 18, 9).fill("#ffffff22");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#ffffff").text(STATUS_LABELS[order.status] ?? order.status, pageWidth - 80, 72, { width: 46, align: "center" });

    doc.y = 126;
    const boxGap = 8;
    const boxWidth = (contentWidth - boxGap) / 2;
    infoBox("Emissao", fmtDate(order.createdAt), null, margin, doc.y, boxWidth);
    infoBox("Cliente", order.customer?.name ?? "Venda avulsa", order.customer?.phone ?? null, margin + boxWidth + boxGap, doc.y, boxWidth);
    doc.y += 66;
    infoBox("Pagamento", PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod, order.channel, margin, doc.y, boxWidth);
    infoBox("Total", fmt(total), `${order.items.length} item(ns)`, margin + boxWidth + boxGap, doc.y, boxWidth);

    doc.y += 82;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text("ITENS DA VENDA", margin, doc.y);
    doc.y += 16;
    tableHeader(doc.y);
    doc.y += 30;

    for (const item of order.items) {
      const name = item.variant
        ? `${item.variant.product.name} - ${item.variant.color} / ${item.variant.size}`
        : (item.label ?? "Item avulso");
      const unitPrice = Number(item.unitPrice);
      const rowHeight = Math.max(28, doc.heightOfString(name, { width: 170 }) + 12);
      ensureSpace(rowHeight + 10);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(ink).text(name, margin + 10, doc.y + 5, { width: 170 });
      doc.font("Helvetica").fontSize(8).fillColor(ink).text(String(item.quantity), margin + 190, doc.y + 5, { width: 32, align: "center" });
      doc.text(fmt(unitPrice), margin + 232, doc.y + 5, { width: 62, align: "right" });
      doc.font("Helvetica-Bold").text(fmt(unitPrice * item.quantity), margin + 304, doc.y + 5, { width: 58, align: "right" });
      doc.moveTo(margin, doc.y + rowHeight).lineTo(pageWidth - margin, doc.y + rowHeight).strokeColor(line).stroke();
      doc.y += rowHeight;
    }

    ensureSpace(138);
    const summaryY = doc.y + 16;
    doc.roundedRect(margin, summaryY, contentWidth, 68, 8).strokeColor(line).dash(3, { space: 3 }).stroke().undash();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Resumo do atendimento", margin + 12, summaryY + 12);
    doc.font("Helvetica").fontSize(8).fillColor(muted).text(
      "Este comprovante registra a venda realizada pela loja. Guarde este documento para conferencia do pedido, forma de pagamento e eventuais combinados registrados na observacao.",
      margin + 12,
      summaryY + 28,
      { width: contentWidth - 24, lineGap: 2 }
    );

    doc.y = summaryY + 84;
    const totalX = margin;
    doc.roundedRect(totalX, doc.y, contentWidth, 86, 10).fill(ink);
    doc.font("Helvetica").fontSize(9).fillColor("#ffffffcc").text("Subtotal", totalX + 14, doc.y + 13);
    doc.text(fmt(subtotal), totalX + 170, doc.y + 13, { width: contentWidth - 184, align: "right" });
    let totalLineY = doc.y + 30;
    if (discount > 0) {
      doc.text("Desconto", totalX + 14, totalLineY);
      doc.text(`- ${fmt(discount)}`, totalX + 170, totalLineY, { width: contentWidth - 184, align: "right" });
      totalLineY += 17;
    }
    if (fee > 0) {
      doc.text("Taxa", totalX + 14, totalLineY);
      doc.text(`+ ${fmt(fee)}`, totalX + 170, totalLineY, { width: contentWidth - 184, align: "right" });
      totalLineY += 17;
    }
    doc.moveTo(totalX + 14, doc.y + 58).lineTo(totalX + contentWidth - 14, doc.y + 58).strokeColor("#ffffff33").stroke();
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#ffffff").text("Total pago", totalX + 14, doc.y + 66);
    doc.text(fmt(total), totalX + 170, doc.y + 66, { width: contentWidth - 184, align: "right" });
    doc.y += 110;

    if (order.installments.length > 0) {
      ensureSpace(80);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(ink).text("PARCELAS DO CREDIARIO", margin, doc.y);
      doc.y += 18;
      tableHeader(doc.y);
      doc.y += 30;
      for (const inst of order.installments) {
        ensureSpace(28);
        doc.font("Helvetica").fontSize(9).fillColor(ink);
        doc.text(`${inst.sequence}/${inst.totalCount}`, margin + 10, doc.y, { width: 45 });
        doc.text(fmtDate(inst.dueDate), margin + 88, doc.y, { width: 82 });
        doc.text(fmt(Number(inst.amount)), margin + 220, doc.y, { width: 70, align: "right" });
        doc.text(inst.paidAt ? "Paga" : "Em aberto", margin + 295, doc.y, { width: 68, align: "right" });
        doc.y += 23;
      }
    }

    if (order.notes) {
      ensureSpace(44);
      doc.roundedRect(margin, doc.y + 8, contentWidth, 40, 8).fillAndStroke(soft, line);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(ink).text("Observacao:", margin + 12, doc.y + 20);
      doc.font("Helvetica").fontSize(9).fillColor(muted).text(order.notes, margin + 80, doc.y + 20, { width: contentWidth - 92 });
      doc.y += 56;
    }

    doc.moveTo(margin, doc.page.height - 58).lineTo(pageWidth - margin, doc.page.height - 58).strokeColor(line).stroke();
    doc.font("Helvetica").fontSize(8).fillColor("#9a8d79").text(`Gerado em ${fmtDate(new Date())}`, margin, doc.page.height - 44);
    doc.text(`${storeNameRaw} - ${order.code}`, margin, doc.page.height - 44, { width: contentWidth, align: "right" });

    doc.end();
    const pdf = await done;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="comprovante-${order.code}.pdf"`,
        "Cache-Control": "no-store"
      }
    });
  }

  const itemsHtml = order.items
    .map((item) => {
      const name = item.variant
        ? `${item.variant.product.name} - ${item.variant.color} / ${item.variant.size}`
        : (item.label ?? "Item avulso");
      const unitPrice = Number(item.unitPrice);
      return `
        <tr>
          <td class="item-name">${escapeHtml(name)}</td>
          <td class="num center">${item.quantity}</td>
          <td class="num">${fmt(unitPrice)}</td>
          <td class="num strong">${fmt(unitPrice * item.quantity)}</td>
        </tr>`;
    })
    .join("");

  const installmentsHtml = order.installments.length
    ? `
      <section class="section">
        <h3>Parcelas do crediario</h3>
        <table>
          <thead>
            <tr>
              <th>Parcela</th>
              <th>Vencimento</th>
              <th class="right">Valor</th>
              <th class="center">Situacao</th>
            </tr>
          </thead>
          <tbody>
            ${order.installments
              .map((inst) => `
                <tr>
                  <td>${inst.sequence}/${inst.totalCount}</td>
                  <td>${fmtDate(inst.dueDate)}</td>
                  <td class="num">${fmt(Number(inst.amount))}</td>
                  <td class="center">${inst.paidAt ? "Paga" : "Em aberto"}</td>
                </tr>`)
              .join("")}
          </tbody>
        </table>
      </section>`
    : "";

  const notesHtml = order.notes
    ? `<div class="notes"><strong>Observacao:</strong> ${escapeHtml(order.notes)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprovante ${escapeHtml(order.code)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #18171f;
      background: #f6f3ee;
      padding: 28px;
      max-width: 760px;
      margin: 0 auto;
    }
    @media print {
      html, body { width: auto; min-width: 0; max-width: none; background: #fff; }
      body { padding: 0; margin: 0; max-width: none; }
      .no-print { display: none !important; }
      .receipt {
        width: 100%;
        max-width: none;
        overflow: visible;
        border: 1px solid #e6dfd2;
        box-shadow: none;
        border-radius: 12px;
        break-inside: avoid;
      }
      .top {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 18px;
        padding: 22px 24px;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .store-name { font-size: 23px; }
      .order-code { font-size: 20px; }
      .content { padding: 22px 24px 24px; }
      .meta { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin-bottom: 18px; }
      .meta-box { min-height: 74px; border-radius: 10px; padding: 10px; break-inside: avoid; }
      .meta-label { font-size: 9px; margin-bottom: 6px; }
      .meta-value { font-size: 12px; overflow-wrap: anywhere; }
      .meta-sub { font-size: 10px; overflow-wrap: anywhere; }
      .section { margin-top: 18px; break-inside: avoid; }
      .section h3 { font-size: 10px; margin-bottom: 8px; }
      table { table-layout: fixed; font-size: 11px; page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      th { padding: 8px 7px; font-size: 8px; letter-spacing: .05em; }
      td { padding: 9px 7px; }
      th:first-child, td:first-child { width: 44%; }
      .item-name { overflow-wrap: anywhere; }
      .summary { grid-template-columns: minmax(0, 1fr) 250px; gap: 16px; margin-top: 14px; break-inside: avoid; }
      .terms { min-height: 92px; border-radius: 10px; padding: 11px; font-size: 10px; }
      .totals {
        border-radius: 12px;
        padding: 12px;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .totals-row { font-size: 11px; margin-bottom: 7px; }
      .totals-row.total { font-size: 16px; }
      .notes { border-radius: 10px; padding: 11px; font-size: 10px; break-inside: avoid; }
      .footer { margin-top: 16px; padding-top: 10px; font-size: 9px; }
    }
    .action-bar {
      display: flex;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .document-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 11px 22px;
      background: #15131f;
      color: #fff;
      text-decoration: none;
      border: none;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 800;
      box-shadow: 0 10px 24px rgba(21, 19, 31, .18);
      cursor: pointer;
    }
    .document-btn:focus-visible {
      outline: 3px solid rgba(21, 19, 31, .22);
      outline-offset: 3px;
    }
    .legacy-print-btn {
      display: block;
      margin: 0 auto 24px;
      padding: 10px 28px;
      background: #15131f;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .share-status {
      margin-top: 8px;
      text-align: center;
      font-size: 12px;
      color: #6f675b;
    }
    .receipt {
      overflow: hidden;
      background: #fffdf9;
      border: 1px solid #e6dfd2;
      border-radius: 18px;
      box-shadow: 0 20px 60px rgba(33, 28, 18, .12);
    }
    .top {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: start;
      padding: 26px 28px;
      color: #fff;
      background: linear-gradient(135deg, #15131f 0%, #2a2141 55%, #7b61ff 100%);
    }
    .eyebrow { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .16em; opacity: .72; }
    .store-name { font-size: 25px; font-weight: 900; letter-spacing: -.03em; margin-top: 5px; }
    .store-tagline { max-width: 420px; font-size: 12px; opacity: .78; margin-top: 3px; }
    .receipt-title { text-align: right; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .13em; opacity: .78; }
    .order-code { margin-top: 7px; font-size: 22px; font-weight: 900; letter-spacing: -.02em; }
    .status-badge {
      display: inline-flex;
      margin-top: 9px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.22);
      font-size: 11px;
      font-weight: 800;
    }
    .content { padding: 24px 28px 28px; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
    .meta-box { min-height: 78px; background: #faf7f0; border: 1px solid #eee4d7; border-radius: 12px; padding: 11px 12px; }
    .meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #8b7f6b; margin-bottom: 7px; }
    .meta-value { font-size: 13px; font-weight: 800; color: #18171f; line-height: 1.25; }
    .meta-sub { font-size: 11px; color: #6f675b; margin-top: 3px; line-height: 1.3; }
    .section { margin-top: 22px; }
    .section h3 { font-size: 12px; font-weight: 900; margin: 0 0 10px; color: #18171f; text-transform: uppercase; letter-spacing: .1em; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #f2eee5; }
    th { padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #746955; }
    td { padding: 11px 10px; border-bottom: 1px solid #eee7dc; vertical-align: top; }
    .item-name { font-weight: 700; color: #27232e; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .center { text-align: center; }
    .right { text-align: right; }
    .strong { font-weight: 900; }
    .summary {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 22px;
      align-items: end;
      margin-top: 18px;
    }
    .terms {
      min-height: 118px;
      border: 1px dashed #ded2c0;
      border-radius: 12px;
      padding: 13px;
      color: #6f675b;
      font-size: 12px;
      line-height: 1.45;
    }
    .totals { background: #15131f; color: #fff; border-radius: 14px; padding: 14px; }
    .totals-row { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; margin-bottom: 8px; color: rgba(255,255,255,.78); }
    .totals-row.total { border-top: 1px solid rgba(255,255,255,.18); margin-top: 10px; padding-top: 12px; font-size: 18px; font-weight: 900; color: #fff; }
    .notes { margin-top: 18px; background:#faf7f0; border:1px solid #eee4d7; border-radius:12px; padding:13px; font-size:12px; color:#554d42; }
    .footer { display:flex; justify-content:space-between; gap:16px; margin-top: 24px; font-size: 11px; color: #9a8d79; border-top: 1px solid #eee4d7; padding-top: 14px; }
    @media (max-width: 640px) {
      body { padding: 12px; }
      .top, .content { padding: 20px; }
      .top { grid-template-columns: 1fr; }
      .receipt-title { text-align: left; }
      .meta { grid-template-columns: 1fr 1fr; }
      .summary { grid-template-columns: 1fr; }
      .footer { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div>
      <a class="document-btn" href="?download=1" download="comprovante-${escapeHtml(order.code)}.pdf">Baixar comprovante</a>
      <div class="share-status">PDF em tamanho compacto de comprovante.</div>
    </div>
  </div>

  <main class="receipt">
    <header class="top">
      <div>
        <div class="eyebrow">Comprovante de venda</div>
        <div class="store-name">${storeName}</div>
        ${storeTagline ? `<div class="store-tagline">${storeTagline}</div>` : ""}
      </div>
      <div>
        <div class="receipt-title">Pedido</div>
        <div class="order-code">${escapeHtml(order.code)}</div>
        <div class="status-badge">${escapeHtml(STATUS_LABELS[order.status] ?? order.status)}</div>
      </div>
    </header>

    <div class="content">
      <div class="meta">
        <div class="meta-box">
          <div class="meta-label">Emissao</div>
          <div class="meta-value">${fmtDate(order.createdAt)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Cliente</div>
          <div class="meta-value">${escapeHtml(order.customer?.name ?? "Venda avulsa")}</div>
          ${order.customer?.phone ? `<div class="meta-sub">${escapeHtml(order.customer.phone)}</div>` : ""}
        </div>
        <div class="meta-box">
          <div class="meta-label">Pagamento</div>
          <div class="meta-value">${escapeHtml(PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod)}</div>
          <div class="meta-sub">${escapeHtml(order.channel)}</div>
        </div>
        <div class="meta-box">
          <div class="meta-label">Total</div>
          <div class="meta-value">${fmt(total)}</div>
          <div class="meta-sub">${order.items.length} item(ns)</div>
        </div>
      </div>

      <section class="section">
        <h3>Itens da venda</h3>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th class="center">Qtd.</th>
              <th class="right">Unit.</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </section>

      <div class="summary">
        <div class="terms">
          <strong>Resumo do atendimento</strong><br />
          Este comprovante registra a venda realizada pela loja. Guarde este documento para conferencia do pedido, forma de pagamento e eventuais combinados registrados na observacao.
        </div>
        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
          ${discount > 0 ? `<div class="totals-row"><span>Desconto</span><span>- ${fmt(discount)}</span></div>` : ""}
          ${fee > 0 ? `<div class="totals-row"><span>Taxa</span><span>+ ${fmt(fee)}</span></div>` : ""}
          <div class="totals-row total"><span>Total pago</span><span>${fmt(total)}</span></div>
        </div>
      </div>

      ${installmentsHtml}
      ${notesHtml}

      <footer class="footer">
        <span>Gerado em ${fmtDate(new Date())}</span>
        <span>${storeName} - ${escapeHtml(order.code)}</span>
      </footer>
    </div>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
