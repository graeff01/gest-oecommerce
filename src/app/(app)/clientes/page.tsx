import { Download, UsersRound } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { CustomerOrdersRow } from "@/components/customer-orders-row";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createCustomerAction, updateCustomerAction, deleteCustomerAction } from "../actions/customers";

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
        select: { id: true, code: true, status: true, total: true, createdAt: true, channel: true, paymentMethod: true, installments: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const customerDebt = customers.map((customer) => {
    const installments = customer.orders.flatMap((o) =>
      o.installments.map((i) => ({ ...i, orderCode: o.code }))
    );
    const open = installments.filter((i) => !i.paidAt);
    return {
      ...customer,
      totalSpent: customer.orders.reduce((s, o) => s + Number(o.total), 0),
      debt: open.reduce((s, i) => s + Number(i.amount), 0),
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
        <form action={createCustomerAction} className="surface-card grid gap-4 p-5 xl:sticky xl:top-4">
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

        <div className="grid gap-3">
          {/* search */}
          <form method="GET" className="flex gap-2">
            <input
              className="field flex-1"
              name="q"
              type="search"
              placeholder="Buscar por nome, e-mail, telefone ou CPF/CNPJ..."
              defaultValue={search}
            />
            <button type="submit" className="button-primary px-4">Buscar</button>
            {search && <a href="/clientes" className="flex items-center rounded-xl border border-border px-3 text-sm text-muted hover:text-fg">Limpar</a>}
          </form>

          <div className="table-shell max-h-[28rem] lg:max-h-[36rem] xl:max-h-[calc(100vh-16rem)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Canal</th>
                  <th>Status</th>
                  <th className="text-right">Total gasto</th>
                  <th className="text-right">Devendo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customerDebt.length ? customerDebt.map((c) => (
                  <CustomerOrdersRow
                    key={c.id}
                    customerId={c.id}
                    orders={c.orders.map((o) => ({
                      id: o.id,
                      code: o.code,
                      status: o.status,
                      total: Number(o.total),
                      createdAt: o.createdAt.toISOString(),
                      channel: o.channel,
                      paymentMethod: o.paymentMethod
                    }))}
                  >
                    <td className="max-w-[12rem] truncate font-semibold text-fg">{c.name}</td>
                    <td className="max-w-[11rem] truncate text-muted">{c.phone || c.email || "-"}</td>
                    <td><span className="chip">{c.orders.length} ped.</span></td>
                    <td className="text-right font-semibold text-fg">{money(c.totalSpent)}</td>
                    <td className="text-right font-semibold">
                      {c.debt > 0
                        ? <span className="text-danger">{money(c.debt)}</span>
                        : <span className="text-muted">-</span>}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-[0.74rem] text-muted transition hover:text-primary"
                          popoverTarget={`edit-customer-${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          ✏
                        </button>
                        <form action={deleteCustomerAction} onClick={(e) => e.stopPropagation()}>
                          <input type="hidden" name="id" value={c.id} />
                          <DeleteButton confirmMessage={`Excluir o cliente "${c.name}"? Esta ação não pode ser desfeita.`} />
                        </form>
                      </div>
                      <div
                        id={`edit-customer-${c.id}`}
                        popover="auto"
                        className="w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl backdrop:bg-fg/20"
                        style={{ maxHeight: "min(90dvh, 560px)" }}
                      >
                        <form action={updateCustomerAction} className="grid gap-3">
                          <input type="hidden" name="id" value={c.id} />
                          <p className="font-display text-base font-semibold text-fg">Editar cliente</p>
                          <label className="label">Nome<input className="field" name="name" defaultValue={c.name} required /></label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="label">E-mail<input className="field" name="email" type="email" defaultValue={c.email ?? ""} /></label>
                            <label className="label">WhatsApp<input className="field" name="phone" defaultValue={c.phone ?? ""} /></label>
                          </div>
                          <label className="label">CPF/CNPJ<input className="field" name="document" defaultValue={c.document ?? ""} /></label>
                          <label className="label">Endereço<input className="field" name="address" defaultValue={c.address ?? ""} /></label>
                          <label className="label">Observações<textarea className="field min-h-16" name="notes" defaultValue={c.notes ?? ""} /></label>
                          <div className="flex gap-2">
                            <button type="submit" className="button-primary flex-1">Salvar</button>
                            <button type="button" popoverTargetAction="hide" popoverTarget={`edit-customer-${c.id}`} className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-fg">Cancelar</button>
                          </div>
                        </form>
                      </div>
                    </td>
                  </CustomerOrdersRow>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted">
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
