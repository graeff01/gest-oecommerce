import { Download } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { OrderForm } from "@/components/order-form";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { date, money } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { cancelOrderAction, updateOrderStatusAction } from "../actions/orders";

const PAGE_SIZE = 20;

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await connection();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [total, orders, customers, variants] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      include: { customer: true, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({
      include: { product: true },
      orderBy: [{ product: { name: "asc" } }, { sku: "asc" }]
    })
  ]);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Vendas"
        description="Registre a venda uma vez: o sistema baixa o estoque automaticamente e cria a receita no financeiro."
        action={<a href="/api/export/orders" className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:text-fg transition"><Download size={15} />Exportar CSV</a>}
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

        <div className="grid gap-2">
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.length ? (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-semibold text-fg">{order.code}</td>
                      <td className="max-w-[12rem] truncate">{order.customer?.name ?? "Avulsa"}</td>
                      <td>
                        <span className="chip max-w-[8rem] truncate">{order.channel}</span>
                      </td>
                      <td>
                        <span className={ORDER_STATUS_TONES[order.status] ?? "status-pill"}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold text-fg">{money(order.total)}</td>
                      <td className="whitespace-nowrap text-muted">{date(order.createdAt)}</td>
                      <td className="whitespace-nowrap">
                        {order.status !== "CANCELED" && order.status !== "DELIVERED" ? (
                          <div className="flex items-center gap-1.5">
                            <form action={updateOrderStatusAction} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={order.id} />
                              <select name="status" defaultValue={order.status} className="field h-7 py-0 text-xs">
                                <option value="NEW">Novo</option>
                                <option value="PAID">Pago</option>
                                <option value="PICKING">Separando</option>
                                <option value="SHIPPED">Enviado</option>
                                <option value="DELIVERED">Entregue</option>
                              </select>
                              <button type="submit" className="h-7 rounded-lg bg-primary-soft px-2 text-xs font-semibold text-primary hover:bg-primary/20">OK</button>
                            </form>
                            <form action={cancelOrderAction}>
                              <input type="hidden" name="id" value={order.id} />
                              <button type="submit" className="text-[0.74rem] text-muted transition hover:text-danger">✕</button>
                            </form>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted">
                      Nenhuma venda registrada ainda. Use o formulário ao lado para criar a primeira.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination total={total} page={page} pageSize={PAGE_SIZE} />
        </div>
      </section>
    </AnimatedShell>
  );
}
