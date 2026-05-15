import { Download, Pencil, UsersRound, X } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createCustomerAction, updateCustomerAction, deleteCustomerAction } from "../actions/customers";

export default async function CustomersPage() {
  await connection();
  const customers = await prisma.customer.findMany({
    include: { orders: { include: { installments: true } } },
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
      openInstallments: open,
      totalInstallments: installments.length
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

        <div className="table-shell max-h-[28rem] lg:max-h-[36rem] xl:max-h-[calc(100vh-13rem)]">
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
              {customerDebt.length ? customerDebt.map((c) => (
                <tr key={c.id}>
                  <td className="max-w-[14rem] truncate font-semibold text-fg">{c.name}</td>
                  <td className="max-w-[12rem] truncate text-muted">{c.phone || c.email || "-"}</td>
                  <td><span className="chip">{c.orders.length}</span></td>
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
                        onClick={undefined}
                        formNoValidate
                        popoverTarget={`edit-customer-${c.id}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <form action={deleteCustomerAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-[0.74rem] text-muted transition hover:text-danger">
                          <X size={13} />
                        </button>
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
                </tr>
              )) : (
                <tr><td colSpan={6} className="py-10 text-center text-muted">Nenhum cliente cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AnimatedShell>
  );
}
