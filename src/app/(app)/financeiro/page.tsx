import { Download, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { DeleteButton } from "@/components/delete-button";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { FinanceForm } from "@/components/finance-form";
import { FinanceMobileList } from "@/components/finance-mobile-list";
import { MetricCard } from "@/components/metric-card";
import { MonthlyClosing } from "@/components/monthly-closing";
import { PageHeader } from "@/components/page-header";
import { ResponsiveFormPanel } from "@/components/responsive-form-panel";
import { date, money, startOfDayBRT, endOfDayBRT } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getStoreSettings, DEFAULT_FINANCE_CATEGORIES } from "@/lib/settings";
import { deleteFinancialTransactionAction, markFinancialTransactionPaidAction } from "../actions/finance";

const FIN_PAGE_SIZE = 30;

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; category?: string; type?: string; page?: string }> }) {
  await connection();
  const { from, to, category, type, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const dateFilter = from || to ? {
    createdAt: {
      ...(from ? { gte: startOfDayBRT(from) } : {}),
      ...(to ? { lte: endOfDayBRT(to) } : {})
    }
  } : {};

  const storeSettings = await getStoreSettings();
  const financeCategories = storeSettings.financeCategories.length
    ? storeSettings.financeCategories
    : DEFAULT_FINANCE_CATEGORIES;

  const txFilter = {
    ...dateFilter,
    ...(category ? { category } : {}),
    ...(type === "REVENUE" || type === "EXPENSE" ? { type: type as "REVENUE" | "EXPENSE" } : {})
  };

  // categories list for filter dropdown
  const allCategories = await prisma.financialTransaction.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" }
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);

  const [totals, totalCount, transactions, monthOrders, stockVariants, openInstallments] = await Promise.all([
    prisma.financialTransaction.groupBy({
      by: ["type"],
      where: dateFilter,
      _sum: { amount: true }
    }),
    prisma.financialTransaction.count({ where: txFilter }),
    prisma.financialTransaction.findMany({
      where: txFilter,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * FIN_PAGE_SIZE,
      take: FIN_PAGE_SIZE
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { not: "CANCELED" } },
      include: { items: true }
    }),
    prisma.productVariant.findMany({ select: { stockQuantity: true, costPrice: true } }),
    prisma.installment.findMany({ where: { paidAt: null }, select: { amount: true, dueDate: true } })
  ]);

  const revenue = Number(totals.find((t) => t.type === "REVENUE")?._sum.amount ?? 0);
  const expenses = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
  const balance = revenue - expenses;
  const monthRevenue = monthOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const productCost = monthOrders.flatMap((order) => order.items).reduce((sum, item) => sum + Number(item.costPrice) * item.quantity, 0);
  const stockValue = stockVariants.reduce((sum, variant) => sum + Number(variant.costPrice) * variant.stockQuantity, 0);
  const receivable = openInstallments.reduce((sum, installment) => sum + Number(installment.amount), 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = openInstallments
    .filter((installment) => installment.dueDate < today)
    .reduce((sum, installment) => sum + Number(installment.amount), 0);
  const profit = monthRevenue - productCost - expenses;

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

      <MonthlyClosing
        revenue={monthRevenue}
        expenses={expenses}
        productCost={productCost}
        stockValue={stockValue}
        receivable={receivable}
        overdue={overdue}
        profit={profit}
      />

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <label className="label w-full min-w-[120px] flex-1 sm:w-auto">
          De<input className="field" name="from" type="date" defaultValue={from ?? ""} />
        </label>
        <label className="label w-full min-w-[120px] flex-1 sm:w-auto">
          Até<input className="field" name="to" type="date" defaultValue={to ?? ""} />
        </label>
        <label className="label w-full min-w-[140px] flex-1 sm:w-auto">
          Tipo
          <select className="field" name="type" defaultValue={type ?? ""}>
            <option value="">Todos</option>
            <option value="REVENUE">Receita</option>
            <option value="EXPENSE">Gasto</option>
          </select>
        </label>
        <label className="label w-full min-w-[160px] flex-1 sm:w-auto">
          Categoria
          <select className="field" name="category" defaultValue={category ?? ""}>
            <option value="">Todas</option>
            {allCategories.map((c) => (
              <option key={c.category} value={c.category}>{c.category}</option>
            ))}
          </select>
        </label>
        <div className="flex w-full gap-2 sm:w-auto sm:self-end">
          <button type="submit" className="button-primary h-10 flex-1 px-4 sm:flex-none">Filtrar</button>
          {(from || to || category || type) && (
            <a href="/financeiro" className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm text-muted hover:text-fg sm:flex-none">Limpar</a>
          )}
        </div>
      </form>

      <section className="grid items-start gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <ResponsiveFormPanel title="Novo lançamento">
          <FinanceForm categories={financeCategories} />
        </ResponsiveFormPanel>

        <div>
          <FinanceMobileList
            transactions={transactions.map((item) => ({
              id: item.id,
              type: item.type,
              title: item.title,
              category: item.category,
              amount: Number(item.amount),
              paidAt: item.paidAt?.toISOString() ?? null,
              dueDate: item.dueDate?.toISOString() ?? null
            }))}
          />

          <div className="table-shell hidden max-h-[28rem] md:block lg:max-h-[36rem] xl:max-h-[calc(100vh-13rem)]">
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
                        <div className="flex items-center gap-2">
                          {!item.paidAt ? (
                            <form action={markFinancialTransactionPaidAction}>
                              <input type="hidden" name="id" value={item.id} />
                              <button className="h-7 rounded-lg bg-success-soft px-2 text-xs font-semibold text-success">Pago</button>
                            </form>
                          ) : null}
                          <form action={deleteFinancialTransactionAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <DeleteButton label="Excluir" confirmMessage="Excluir este lançamento financeiro? Esta ação não pode ser desfeita." />
                          </form>
                        </div>
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
          <Pagination total={totalCount} page={page} pageSize={FIN_PAGE_SIZE} />
        </div>
      </section>
    </AnimatedShell>
  );
}
