import { Download, UsersRound } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { CustomerMobileCard } from "@/components/customer-mobile-card";
import { CustomerOrdersRow } from "@/components/customer-orders-row";
import { PageHeader } from "@/components/page-header";
import { ResponsiveFormPanel } from "@/components/responsive-form-panel";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createCustomerAction } from "../actions/customers";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const { q } = await searchParams;
  const search = q?.trim() ?? "";

  const customers = await prisma.customer.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { document: { contains: search, mode: "insensitive" } }
      ]
    } : undefined,
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          status: true,
          total: true,
          createdAt: true,
          channel: true,
          paymentMethod: true,
          installments: true,
          items: {
            select: {
              quantity: true,
              label: true,
              variant: { select: { product: { select: { name: true } } } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const rows = customers.map((c) => {
    const installments = c.orders.flatMap((o) => o.installments);
    const open = installments.filter((i) => !i.paidAt);
    const sortedOrders = [...c.orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const lastOrder = sortedOrders[0] ?? null;
    const openInstallments = c.orders
      .flatMap((order) => order.installments.map((installment) => ({ ...installment, orderCode: order.code })))
      .filter((installment) => !installment.paidAt)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const lastOrderItems = lastOrder?.items
      .map((item) => item.variant?.product.name ?? item.label ?? "item")
      .filter(Boolean)
      .slice(0, 2)
      .join(", ") ?? null;
    const daysInactive = lastOrder
      ? Math.floor((Date.now() - lastOrder.createdAt.getTime()) / 86_400_000)
      : null;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      document: c.document,
      address: c.address,
      notes: c.notes,
      totalSpent: c.orders.reduce((s, o) => s + Number(o.total), 0),
      debt: open.reduce((s, i) => s + Number(i.amount), 0),
      nextDueDate: openInstallments[0]?.dueDate.toISOString() ?? null,
      daysInactive,
      lastOrderCode: lastOrder?.code ?? openInstallments[0]?.orderCode ?? null,
      lastOrderTotal: lastOrder ? Number(lastOrder.total) : null,
      lastOrderItems,
      ordersCount: c.orders.length,
      orders: c.orders.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
        channel: o.channel,
        paymentMethod: o.paymentMethod,
        itemsLabel: o.items
          .map((item) => item.variant?.product.name ?? item.label ?? "item")
          .filter(Boolean)
          .slice(0, 2)
          .join(", ")
      }))
    };
  });

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Clientes"
        description="Centralize contato, endereço, observações e histórico de compras."
        action={<a href="/api/export/customers" className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:text-fg transition"><Download size={15} />Exportar CSV</a>}
      />

      <section className="grid items-start gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <ResponsiveFormPanel title="Novo cliente">
        <form action={createCustomerAction} className="surface-card grid gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-success to-success/70 text-primary-fg">
              <UsersRound size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo cliente</h2>
              <p className="text-[0.76rem] font-normal text-muted">Cadastro completo para CRM e fidelização.</p>
            </div>
          </div>
          <label className="label">Nome<input className="field" name="name" required /></label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">E-mail<input className="field" name="email" type="email" /></label>
            <label className="label">WhatsApp<input className="field" name="phone" /></label>
          </div>
          <label className="label">CPF/CNPJ<input className="field" name="document" /></label>
          <label className="label">Endereço<input className="field" name="address" /></label>
          <label className="label">Observações<textarea className="field min-h-16" name="notes" /></label>
          <button className="button-primary">Cadastrar cliente</button>
        </form>
        </ResponsiveFormPanel>

        <div className="grid gap-3">
          <form method="GET" className="grid gap-2 sm:flex">
            <input
              className="field flex-1"
              name="q"
              type="search"
              placeholder="Buscar por nome, e-mail, telefone ou CPF/CNPJ..."
              defaultValue={search}
            />
            <button type="submit" className="button-primary px-4">Buscar</button>
            {search && <a href="/clientes" className="flex min-h-10 items-center justify-center rounded-xl border border-border px-3 text-sm text-muted hover:text-fg">Limpar</a>}
          </form>

          <div className="grid gap-3 md:hidden">
            {rows.length ? rows.map((c) => (
              <CustomerMobileCard key={c.id} c={c} />
            )) : (
              <div className="surface-card p-6 text-center text-muted">
                {search ? `Nenhum cliente encontrado para "${search}".` : "Nenhum cliente cadastrado ainda."}
              </div>
            )}
          </div>

          <div className="table-shell hidden max-h-[28rem] md:block lg:max-h-[36rem] xl:max-h-[calc(100vh-16rem)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Pedidos</th>
                  <th className="text-right">Total gasto</th>
                  <th className="text-right">Devendo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((c) => (
                  <CustomerOrdersRow key={c.id} c={c} />
                )) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted">
                      {search ? `Nenhum cliente encontrado para "${search}".` : "Nenhum cliente cadastrado ainda."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AnimatedShell>
  );
}
