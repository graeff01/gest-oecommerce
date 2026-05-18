import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SALES", "FINANCE"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const storeNameRaw = settings?.storeName ?? "Loja";
  const storeTaglineRaw = settings?.storeTagline ?? "";
  const storeName = escapeHtml(storeNameRaw);
  const storeTagline = escapeHtml(storeTaglineRaw);
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const fee = Number(order.fee);
  const total = Number(order.total);

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
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #18171f;
      background: #f6f3ee;
      padding: 28px;
      max-width: 760px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 0; max-width: 100%; background: #fff; }
      .no-print { display: none !important; }
      .receipt { box-shadow: none; border-radius: 0; }
    }
    .action-bar {
      display: flex;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .whatsapp-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 11px 22px;
      background: #12a150;
      color: #fff;
      text-decoration: none;
      border: none;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 800;
      box-shadow: 0 10px 24px rgba(18, 161, 80, .22);
      cursor: pointer;
    }
    .whatsapp-btn:focus-visible {
      outline: 3px solid rgba(18, 161, 80, .28);
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
      <button class="whatsapp-btn" id="share-receipt" type="button">Compartilhar imagem no WhatsApp</button>
      <div class="share-status" id="share-status"></div>
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

  <script>
    const orderCode = ${JSON.stringify(order.code)};

    function setStatus(message) {
      const el = document.getElementById("share-status");
      if (el) el.textContent = message || "";
    }

    function downloadBlob(blob, fileName) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function receiptToBlob() {
      const receipt = document.querySelector(".receipt");
      if (!receipt) throw new Error("Comprovante nao encontrado.");

      const rect = receipt.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      const clone = receipt.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      clone.style.width = width + "px";
      clone.style.margin = "0";
      clone.style.boxShadow = "none";

      const css = Array.from(document.querySelectorAll("style")).map((style) => style.textContent || "").join("\\n");
      const serialized = new XMLSerializer().serializeToString(clone);
      const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">',
        '<foreignObject width="100%" height="100%">',
        '<div xmlns="http://www.w3.org/1999/xhtml">',
        '<style>' + css + '</style>',
        serialized,
        '</div>',
        '</foreignObject>',
        '</svg>'
      ].join("");

      const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      try {
        const image = new Image();
        image.decoding = "async";
        image.src = svgUrl;
        await image.decode();

        const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas indisponivel.");
        ctx.fillStyle = "#fffdf9";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0);

        return await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Nao foi possivel gerar a imagem.")), "image/png", 0.96);
        });
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    }

    async function shareReceipt() {
      const button = document.getElementById("share-receipt");
      const fileName = "comprovante-" + orderCode + ".png";
      try {
        if (button) button.setAttribute("disabled", "true");
        setStatus("Gerando imagem do comprovante...");
        const blob = await receiptToBlob();
        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          await navigator.share({
            files: [file],
            title: "Comprovante " + orderCode
          });
          setStatus("");
          return;
        }

        downloadBlob(blob, fileName);
        setStatus("Imagem baixada. Anexe o arquivo no WhatsApp.");
      } catch (error) {
        console.error(error);
        setStatus("Nao foi possivel compartilhar automaticamente. Tente pelo celular ou baixe a imagem.");
      } finally {
        if (button) button.removeAttribute("disabled");
      }
    }

    document.getElementById("share-receipt")?.addEventListener("click", shareReceipt);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
