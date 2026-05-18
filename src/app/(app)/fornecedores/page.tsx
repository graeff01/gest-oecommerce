import { Pencil } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { ResponsiveFormPanel } from "@/components/responsive-form-panel";
import { SupplierCreateForm, SupplierEditForm } from "@/components/supplier-forms";
import { prisma } from "@/lib/prisma";
import { deleteSupplierAction } from "../actions/suppliers";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const { q } = await searchParams;
  const search = q?.trim() ?? "";

  const suppliers = await prisma.supplier.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { contact: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { document: { contains: search, mode: "insensitive" } }
      ]
    } : undefined,
    include: { purchases: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Fornecedores"
        description="Organize fornecedores, contatos, prazos e histórico de compras de mercadoria."
      />
      <section className="grid items-start gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <ResponsiveFormPanel title="Novo fornecedor">
          <SupplierCreateForm />
        </ResponsiveFormPanel>

        <div className="grid gap-3">
          <form method="GET" className="grid gap-2 sm:flex">
            <input className="field flex-1" name="q" type="search" placeholder="Buscar por nome, contato, telefone ou CNPJ..." defaultValue={search} />
            <button type="submit" className="button-primary px-4">Buscar</button>
            {search && <a href="/fornecedores" className="flex min-h-10 items-center justify-center rounded-xl border border-border px-3 text-sm text-muted hover:text-fg">Limpar</a>}
          </form>

          <div className="table-shell max-h-[32rem] xl:max-h-[calc(100vh-16rem)]">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>Compras</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length ? suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="max-w-[14rem] truncate font-semibold text-fg">{s.name}</td>
                  <td className="max-w-[12rem] truncate text-muted">{s.contact || s.email || "-"}</td>
                  <td className="text-muted">{s.phone || "-"}</td>
                  <td><span className="chip">{s.purchases.length}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="text-[0.74rem] text-muted transition hover:text-primary"
                        popoverTarget={`edit-supplier-${s.id}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <form action={deleteSupplierAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <DeleteButton confirmMessage={`Excluir o fornecedor "${s.name}"? Esta ação não pode ser desfeita.`} />
                      </form>
                    </div>

                    <div
                      id={`edit-supplier-${s.id}`}
                      popover="auto"
                      className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xl backdrop:bg-fg/20"
                    >
                      <SupplierEditForm supplier={s} popoverId={`edit-supplier-${s.id}`} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-10 text-center text-muted">Nenhum fornecedor cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </AnimatedShell>
  );
}
