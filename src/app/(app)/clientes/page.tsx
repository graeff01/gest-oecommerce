import { UsersRound, Wallet } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createCustomerAction, updateCustomerAction, deleteCustomerAction, payInstallmentAction } from "../actions";

export default async function CustomersPage() {
  await connection();
  const customers = await prisma.customer.findMany({
    include: {
      orders: {
        include: { installments: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const customerDebt = customers.map((customer) => {
    const installments = customer.orders.flatMap((order) =>
      order.installments.map((i) => ({ ...i, orderCode: order.code }))
    );
    const open = installments.filter((i) => !i.paidAt);
    const totalSpent = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
    const debt = open.reduce((sum, i) => sum + Number(i.amount), 0);
    return {
      ...customer,
      totalSpent,
      debt,
      openInstallments: open,
      totalInstallments: installments.length
    };
  });

  const openInstallments = customerDebt
    .flatMap((c) =>
      c.openInstallments.map((i) => ({
        ...i,
        customerName: c.name
      }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader title="Clientes" description="Centralize contato, endereço, observações e histórico de compras." />
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
          <label className="label">
            Nome<input className="field" name="name" required />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">
              E-mail<input className="field" name="email" type="email" />
            </label>
            <label className="label">
              WhatsApp<input className="field" name="phone" />
            </label>
          </div>
          <label className="label">
            CPF/CNPJ<input className="field" name="document" />
          </label>
          <label className="label">
            Endereço<input className="field" name="address" />
          </label>
          <label className="label">
            Observações<textarea className="field min-h-20" name="notes" />
          </label>
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
                <th>Parcelas em aberto</th>
              </tr>
            </thead>
            <tbody>
              {customerDebt.length ? (
                customerDebt.map((customer) => {
                  const openCount = customer.openInstallments.length;
                  return (
                    <tr key={customer.id}>
                      <td className="font-semibold text-fg">{customer.name}</td>
                      <td>{customer.phone || customer.email || "-"}</td>
                      <td>
                        <span className="chip">{customer.orders.length}</span>
                      </td>
                      <td className="text-right font-semibold text-fg">{money(customer.totalSpent)}</td>
                      <td className="text-right font-semibold">
                        {customer.debt > 0 ? (
                          <span className="text-danger">{money(customer.debt)}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {openCount > 0 ? (
                          <span className="status-pill pill-warning">
                            {openCount} de {customer.totalInstallments}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card grid gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-warning to-warning/70 text-primary-fg">
            <Wallet size={17} strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Crediário em aberto</h2>
            <p className="text-[0.76rem] font-normal text-muted">
              Parcelas vendidas direto para clientes. Marcar como paga gera receita no financeiro.
            </p>
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
              {openInstallments.length ? (
                openInstallments.map((i) => {
                  const due = new Date(i.dueDate);
                  due.setHours(0, 0, 0, 0);
                  const overdue = due < today;
                  return (
                    <tr key={i.id}>
                      <td className="font-semibold text-fg">{i.customerName}</td>
                      <td className="text-muted">{i.orderCode}</td>
                      <td>
                        <span className="chip">
                          {i.sequence}/{i.totalCount}
                        </span>
                      </td>
                      <td>
                        <span className={overdue ? "status-pill pill-danger" : "text-muted"}>{date(i.dueDate)}</span>
                      </td>
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
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    Nenhuma parcela em aberto. Quando vender no crediário, as parcelas aparecem aqui.
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
