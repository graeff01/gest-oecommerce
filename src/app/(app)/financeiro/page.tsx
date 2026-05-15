import { Download, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { FinanceForm } from "@/components/finance-form";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getStoreSettings, DEFAULT_FINANCE_CATEGORIES } from "@/lib/settings";
import { deleteFinancialTransactionAction } from "../actions/finance";

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await connection();
  const { from, to } = await searchParams;

  const dateFilter = from || to ? {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {})
    }
  } : {};

  const storeSettings = await getStoreSettings();
  const financeCategories = storeSettings.financeCategories.length
    ? storeSettings.financeCategories
    : DEFAULT_FINANCE_CATEGORIES;

  const [totals, transactions] = await Promise.all([
    prisma.financialTransaction.groupBy({
      by: ["type"],
      where: dateFilter,
      _sum: { amount: true }
    }),
    prisma.financialTransaction.findMany({
      where: dateFilter,
      orderBy: { createdAt: "desc" }
    })
  ]);

  const revenue = Number(totals.find((t) => t.type === "REVENUE")?._sum.amount ?? 0);
  const expenses = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
  const balance = revenue - expenses;

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Financeiro"
        description="Controle receitas, gastos, contas pagas, contas abertas e categorias do caixa."
        action={<a href={`/api/export/finance${from || to ? `?${from ? `from=${from}` : ""}${from && to ? "&" : ""}${to ? `to=${to}` : ""}` : ""}`} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:text-fg transition"><Download size={15} />Exportar CSV</a>}
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

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <label className="label w-full min-w-[140px] flex-1 sm:w-auto">
          De<input className="field" name="from" type="date" defaultValue={from ?? ""} />
        </label>
        <label className="label w-full min-w-[140px] flex-1 sm:w-auto">
          Até<input className="field" name="to" type="date" defaultValue={to ?? ""} />
        </label>
        <div className="flex w-full gap-2 sm:w-auto sm:self-end">
          <button type="submit" className="button-primary h-10 flex-1 px-4 sm:flex-none">Filtrar</button>
          {(from || to) && (
            <a href="/financeiro" className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm text-muted hover:text-fg sm:flex-none">Limpar</a>
          )}
        </div>
      </form>

      <section className="grid items-start gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <div className="xl:sticky xl:top-4">
          <FinanceForm categories={financeCategories} />
        </div>

        <div className="grid gap-2">
          <div className="table-shell max-h-[32rem] overflow-auto xl:max-h-[calc(100vh-12rem)]">
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
                      <td className="max-w-[16rem] truncate font-semibold text-fg">{item.title}</td>
                      <td>
                        <span className="chip max-w-[10rem] truncate">{item.category}</span>
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold text-fg">{money(item.amount)}</td>
                      <td className="whitespace-nowrap text-muted">{date(item.paidAt)}</td>
                      <td className="whitespace-nowrap text-muted">{date(item.dueDate)}</td>
                      <td>
                        <form action={deleteFinancialTransactionAction}>
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
        </div>
      </section>
    </AnimatedShell>
  );
}
