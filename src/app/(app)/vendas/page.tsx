import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { OrderForm } from "@/components/order-form";
import { PageHeader } from "@/components/page-header";
import { date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const statusLabel: Record<string, string> = {
  NEW: "Novo",
  PAID: "Pago",
  PICKING: "Separando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado"
};

const statusTone: Record<string, string> = {
  NEW: "status-pill pill-info",
  PAID: "status-pill",
  PICKING: "status-pill pill-warning",
  SHIPPED: "status-pill pill-primary",
  DELIVERED: "status-pill",
  CANCELED: "status-pill pill-danger"
};

export default async function SalesPage() {
  await connection();
  const [orders, customers, variants] = await Promise.all([
    prisma.order.findMany({
      include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({
      include: { product: true },
      where: { stockQuantity: { gt: 0 } },
      orderBy: { sku: "asc" }
    })
  ]);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Vendas"
        description="Registre a venda uma vez: o sistema baixa o estoque automaticamente e cria a receita no financeiro."
      />
      <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <OrderForm
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          variants={variants.map((v) => ({
            id: v.id,
            color: v.color,
            size: v.size,
            salePrice: Number(v.salePrice),
            stockQuantity: v.stockQuantity,
            product: { name: v.product.name }
          }))}
        />

        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-semibold text-fg">{order.code}</td>
                    <td>{order.customer?.name ?? "Avulsa"}</td>
                    <td>
                      <span className="chip">{order.channel}</span>
                    </td>
                    <td>
                      <span className={statusTone[order.status] ?? "status-pill"}>
                        {statusLabel[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="text-right font-semibold text-fg">{money(order.total)}</td>
                    <td className="text-muted">{date(order.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    Nenhuma venda registrada ainda. Use o formulário ao lado para criar a primeira.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AnimatedShell>
  );
}
