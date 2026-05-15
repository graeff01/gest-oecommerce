import { CalendarDays, Download, Pencil, UsersRound, Wallet, X } from "lucide-react";
import { InstallmentsTable } from "@/components/installments-table";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { date, money } from "@/lib/format";
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

  const openInstallments = customerDebt
    .flatMap((c) => c.openInstallments.map((i) => ({ ...i, customerName: c.name, customerPhone: c.phone ?? null })))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Agenda: próximos 30 dias, agrupado por data
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  const scheduleMap = new Map<string, { total: number; count: number; overdue: boolean }>();
  for (const inst of openInstallments) {
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    const key = due.toISOString().slice(0, 10);
    const overdue = due < today;
    const existing = scheduleMap.get(key);
    if (existing) {
      existing.total += Number(inst.amount);
      existing.count += 1;
    } else {
      scheduleMap.set(key, { total: Number(inst.amount), count: 1, overdue });
    }
  }
  // Sort: overdue first (desc), then upcoming (asc)
  const scheduleEntries = Array.from(scheduleMap.entries()).sort(([a], [b]) => {
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    const todayTs = today.getTime();
    const aOver = da < todayTs;
    const bOver = db < todayTs;
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    return aOver ? db - da : da - db; // overdue: mais antigo primeiro; futuro: mais próximo primeiro
  });

  return (
    <AnimatedShell className="flex min-h-0 flex-col gap-4">
      <PageHeader title="Clientes" description="Centralize contato, endereço, observações e histórico de compras." action={<a href="/api/export/customers" className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:text-fg transition"><Download size={15} />Exportar CSV</a>} />

      <section className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <form action={createCustomerAction} className="surface-card grid gap-4 overflow-y-auto p-5">
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

        <div className="table-shell min-h-0 h-full">
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

      {/* crediário */}
      <section className="surface-card grid gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-warning to-warning/70 text-primary-fg">
            <Wallet size={17} strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Crediário em aberto</h2>
            <p className="text-[0.76rem] font-normal text-muted">Selecione várias parcelas para marcar como pagas de uma vez.</p>
          </div>
        </div>
        <InstallmentsTable
          installments={openInstallments.map((i) => ({
            ...i,
            amount: Number(i.amount),
            dueDate: i.dueDate instanceof Date ? i.dueDate.toISOString() : String(i.dueDate),
            customerPhone: i.customerPhone ?? null
          }))}
        />
      </section>
      {/* agenda de recebimentos */}
      {scheduleEntries.length > 0 && (
        <section className="surface-card grid gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
              <CalendarDays size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Agenda de recebimentos</h2>
              <p className="text-[0.76rem] font-normal text-muted">Previsão por dia com base nas parcelas em aberto.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {scheduleEntries.map(([dateKey, { total, count, overdue }]) => {
              const d = new Date(dateKey + "T12:00:00");
              const isToday = dateKey === today.toISOString().slice(0, 10);
              return (
                <div
                  key={dateKey}
                  className={`flex min-w-[9rem] flex-1 flex-col gap-1 rounded-xl border px-4 py-3 ${
                    overdue
                      ? "border-danger/25 bg-danger-soft"
                      : isToday
                        ? "border-success/30 bg-success-soft"
                        : "border-border bg-surface-2/40"
                  }`}
                >
                  <span className={`text-[0.72rem] font-semibold uppercase tracking-wide ${overdue ? "text-danger" : isToday ? "text-success" : "text-muted"}`}>
                    {overdue ? "Vencido · " : isToday ? "Hoje · " : ""}
                    {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                  </span>
                  <span className="font-display text-lg font-semibold text-fg">{money(total)}</span>
                  <span className="text-[0.74rem] text-muted">{count} {count === 1 ? "parcela" : "parcelas"}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </AnimatedShell>
  );
}
