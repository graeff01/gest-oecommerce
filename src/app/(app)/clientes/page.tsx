import { Download, Pencil, UsersRound, Wallet, X } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createCustomerAction, updateCustomerAction, deleteCustomerAction } from "../actions/customers";
import { payInstallmentAction } from "../actions/orders";

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

  const openInstallments = customerDebt
    .flatMap((c) => c.openInstallments.map((i) => ({ ...i, customerName: c.name })))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader title="Clientes" description="Centralize contato, endereço, observações e histórico de compras." action={<a href="/api/export/customers" className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:text-fg transition"><Download size={15} />Exportar CSV</a>} />

      <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
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

        <div className="table-shell overflow-x-auto">
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
                  <td className="font-semibold text-fg">{c.name}</td>
                  <td className="text-muted">{c.phone || c.email || "-"}</td>
                  <td><span className="chip">{c.orders.length}</span></td>
                  <td className="text-right font-semibold text-fg">{money(c.totalSpent)}</td>
                  <td className="text-right font-semibold">
                    {c.debt > 0
                      ? <span className="text-danger">{money(c.debt)}</span>
                      : <span className="text-muted">-</span>}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      {/* edit dialog trigger */}
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
                    {/* edit popover */}
                    <div
                      id={`edit-customer-${c.id}`}
                      popover="auto"
                      className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl backdrop:bg-fg/20"
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

      {/* crediário */}
      <section className="surface-card grid gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-warning to-warning/70 text-primary-fg">
            <Wallet size={17} strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Crediário em aberto</h2>
            <p className="text-[0.76rem] font-normal text-muted">Parcelas vendidas direto para clientes.</p>
          </div>
        </div>
        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Pedido</th>
                <th>Parcela</th>
                <th>Vencimento</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {openInstallments.length ? openInstallments.map((i) => {
                const due = new Date(i.dueDate);
                due.setHours(0, 0, 0, 0);
                const overdue = due < today;
                return (
                  <tr key={i.id}>
                    <td className="font-semibold text-fg">{i.customerName}</td>
                    <td className="text-muted">{i.orderCode}</td>
                    <td><span className="chip">{i.sequence}/{i.totalCount}</span></td>
                    <td><span className={overdue ? "status-pill pill-danger" : "text-muted"}>{date(i.dueDate)}</span></td>
                    <td className="text-right font-semibold text-fg">{money(i.amount)}</td>
                    <td className="text-right">
                      <form action={payInstallmentAction} className="flex items-center justify-end gap-2">
                        <input type="hidden" name="installmentId" value={i.id} />
                        <select className="field h-8 py-1 text-xs" name="paymentMethod" defaultValue="PIX">
                          <option value="PIX">Pix</option>
                          <option value="CASH">Dinheiro</option>
                          <option value="DEBIT_CARD">Débito</option>
                          <option value="CREDIT_CARD">Crédito</option>
                          <option value="BANK_SLIP">Boleto</option>
                        </select>
                        <button className="button-primary h-8 px-3 py-1 text-xs">Marcar paga</button>
                      </form>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="py-10 text-center text-muted">Nenhuma parcela em aberto.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AnimatedShell>
  );
}
