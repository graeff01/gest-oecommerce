import { CircleDollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { date, money } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createFinancialTransactionAction, deleteFinancialTransactionAction } from "../actions/finance";

const PAGE_SIZE = 30;

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await connection();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [totals, transactions, total] = await Promise.all([
    prisma.financialTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true }
    }),
    prisma.financialTransaction.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.financialTransaction.count()
  ]);

  const revenue = Number(totals.find((t) => t.type === "REVENUE")?._sum.amount ?? 0);
  const expenses = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
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
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
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

        <div className="grid gap-2">
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
                  <th></th>
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
                      <td>
                        <form action={deleteFinancialTransactionAction} onSubmit={(e) => { if (!confirm("Excluir este lançamento?")) e.preventDefault(); }}>
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="text-[0.74rem] text-muted transition hover:text-danger">Excluir</button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted">
                      Nenhum lançamento financeiro registrado.
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
