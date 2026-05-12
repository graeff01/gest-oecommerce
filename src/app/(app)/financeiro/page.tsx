import { CircleDollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createFinancialTransactionAction } from "../actions";

export default async function FinancePage() {
  await connection();
  const transactions = await prisma.financialTransaction.findMany({ orderBy: { createdAt: "desc" } });
  const revenue = transactions.filter((item) => item.type === "REVENUE").reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = revenue - expenses;

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Financeiro"
        description="Controle receitas, gastos, contas pagas, contas abertas e categorias do caixa."
      />
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Receitas" value={money(revenue)} detail="Entradas registradas" icon={TrendingUp} tone="success" />
        <MetricCard label="Gastos" value={money(expenses)} detail="Saídas registradas" icon={TrendingDown} tone="danger" />
        <MetricCard
          label="Saldo"
          value={money(balance)}
          detail={balance >= 0 ? "Resultado positivo" : "Resultado negativo"}
          icon={Wallet}
          tone="primary"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <form action={createFinancialTransactionAction} className="surface-card grid gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
              <CircleDollarSign size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo lançamento</h2>
              <p className="text-[0.76rem] font-normal text-muted">Receita ou despesa, com vínculo de pagamento.</p>
            </div>
          </div>
          <label className="label">
            Tipo
            <select className="field" name="type">
              <option value="REVENUE">Receita</option>
              <option value="EXPENSE">Gasto</option>
            </select>
          </label>
          <label className="label">
            Título<input className="field" name="title" required />
          </label>
          <label className="label">
            Categoria<input className="field" name="category" placeholder="Vendas, Marketing, Aluguel" required />
          </label>
          <label className="label">
            Valor<input className="field" name="amount" type="number" min="0" step="0.01" required />
          </label>
          <label className="label">
            Pagamento
            <select className="field" name="paymentMethod">
              <option value="">Não definido</option>
              <option value="PIX">Pix</option>
              <option value="CREDIT_CARD">Cartão crédito</option>
              <option value="DEBIT_CARD">Cartão débito</option>
              <option value="CASH">Dinheiro</option>
              <option value="BANK_SLIP">Boleto</option>
              <option value="MARKETPLACE">Marketplace</option>
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">
              Vencimento<input className="field" name="dueDate" type="date" />
            </label>
            <label className="label">
              Pago em<input className="field" name="paidAt" type="date" />
            </label>
          </div>
          <label className="label">
            Observações<textarea className="field min-h-20" name="notes" />
          </label>
          <button className="button-primary">Salvar lançamento</button>
        </form>

        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Título</th>
                <th>Categoria</th>
                <th className="text-right">Valor</th>
                <th>Pago</th>
                <th>Venc.</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length ? (
                transactions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={item.type === "REVENUE" ? "status-pill" : "status-pill pill-danger"}>
                        {item.type === "REVENUE" ? "Receita" : "Gasto"}
                      </span>
                    </td>
                    <td className="font-semibold text-fg">{item.title}</td>
                    <td>
                      <span className="chip">{item.category}</span>
                    </td>
                    <td className="text-right font-semibold text-fg">{money(item.amount)}</td>
                    <td className="text-muted">{date(item.paidAt)}</td>
                    <td className="text-muted">{date(item.dueDate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    Nenhum lançamento financeiro registrado.
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
