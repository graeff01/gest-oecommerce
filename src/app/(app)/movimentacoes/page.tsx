import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, RotateCcw } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { date } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 40;

const TYPE_LABELS: Record<string, string> = {
  IN: "Entrada",
  OUT: "Saída",
  SALE: "Venda",
  RETURN: "Devolução",
  ADJUSTMENT: "Ajuste"
};

const TYPE_TONES: Record<string, string> = {
  IN: "status-pill",
  OUT: "status-pill pill-danger",
  SALE: "status-pill pill-danger",
  RETURN: "status-pill",
  ADJUSTMENT: "status-pill pill-warning"
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  IN: <ArrowDownToLine size={14} />,
  OUT: <ArrowUpFromLine size={14} />,
  SALE: <ArrowUpFromLine size={14} />,
  RETURN: <RotateCcw size={14} />,
  ADJUSTMENT: <RefreshCw size={14} />
};

export default async function MovimentacoesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; product?: string }>;
}) {
  await connection();
  const { page: pageParam, product: productFilter } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  const variantIds = productFilter
    ? (await prisma.productVariant.findMany({
        where: { productId: productFilter },
        select: { id: true }
      })).map((v) => v.id)
    : undefined;

  const where = variantIds ? { variantId: { in: variantIds } } : {};

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        variant: { include: { product: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.stockMovement.count({ where })
  ]);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Movimentações"
        description="Histórico completo de entradas, saídas, ajustes e vendas por variação."
      />

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <label className="label w-full flex-1 sm:min-w-[200px] sm:w-auto">
          Produto
          <select className="field" name="product" defaultValue={productFilter ?? ""}>
            <option value="">Todos os produtos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <div className="flex w-full gap-2 sm:w-auto sm:self-end">
          <button type="submit" className="button-primary h-10 flex-1 px-4 sm:flex-none">Filtrar</button>
          {productFilter && (
            <a href="/movimentacoes" className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm text-muted hover:text-fg sm:flex-none">Limpar</a>
          )}
        </div>
      </form>

      <div className="grid gap-2">
        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Produto</th>
                <th>Variação / SKU</th>
                <th>Qtd.</th>
                <th>Motivo</th>
                <th>Usuário</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {movements.length ? (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className={`${TYPE_TONES[m.type] ?? "status-pill"} flex items-center gap-1.5`}>
                        {TYPE_ICONS[m.type]}
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                    </td>
                    <td className="max-w-[14rem] truncate font-semibold text-fg">{m.variant.product.name}</td>
                    <td className="max-w-[12rem]">
                      <p className="truncate text-[0.82rem] font-medium text-fg">{m.variant.color} / {m.variant.size}</p>
                      <p className="truncate text-[0.74rem] text-muted">{m.variant.sku}</p>
                    </td>
                    <td className="font-semibold text-fg">{m.quantity}</td>
                    <td className="max-w-[14rem] truncate text-muted">{m.reason}</td>
                    <td className="max-w-[10rem] truncate text-muted">{m.user?.name ?? "-"}</td>
                    <td className="text-muted">{date(m.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} />
      </div>
    </AnimatedShell>
  );
}
