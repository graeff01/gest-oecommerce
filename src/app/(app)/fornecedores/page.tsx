import { Building2, Pencil, X } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { createSupplierAction, updateSupplierAction, deleteSupplierAction } from "../actions/suppliers";

export default async function SuppliersPage() {
  await connection();
  const suppliers = await prisma.supplier.findMany({
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
        <form action={createSupplierAction} className="surface-card grid gap-4 p-5 xl:sticky xl:top-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-info to-primary text-primary-fg shadow-glow">
              <Building2 size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo fornecedor</h2>
              <p className="text-[0.76rem] font-normal text-muted">Cadastro com contato e dados fiscais.</p>
            </div>
          </div>
          <label className="label">Nome<input className="field" name="name" required /></label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">CNPJ/CPF<input className="field" name="document" /></label>
            <label className="label">Contato<input className="field" name="contact" /></label>
            <label className="label">Telefone<input className="field" name="phone" /></label>
            <label className="label">E-mail<input className="field" name="email" type="email" /></label>
          </div>
          <label className="label">Observações<textarea className="field min-h-16" name="notes" /></label>
          <button className="button-primary">Cadastrar fornecedor</button>
        </form>

        <div className="table-shell max-h-[32rem] xl:max-h-[calc(100vh-12rem)]">
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
                        <button type="submit" className="text-[0.74rem] text-muted transition hover:text-danger">
                          <X size={13} />
                        </button>
                      </form>
                    </div>

                    <div
                      id={`edit-supplier-${s.id}`}
                      popover="auto"
                      className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xl backdrop:bg-fg/20"
                    >
                      <form action={updateSupplierAction} className="grid gap-3">
                        <input type="hidden" name="id" value={s.id} />
                        <p className="font-display text-base font-semibold text-fg">Editar fornecedor</p>
                        <label className="label">Nome<input className="field" name="name" defaultValue={s.name} required /></label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="label">CNPJ/CPF<input className="field" name="document" defaultValue={s.document ?? ""} /></label>
                          <label className="label">Contato<input className="field" name="contact" defaultValue={s.contact ?? ""} /></label>
                          <label className="label">Telefone<input className="field" name="phone" defaultValue={s.phone ?? ""} /></label>
                          <label className="label">E-mail<input className="field" name="email" type="email" defaultValue={s.email ?? ""} /></label>
                        </div>
                        <label className="label">Observações<textarea className="field min-h-16" name="notes" defaultValue={s.notes ?? ""} /></label>
                        <div className="flex gap-2">
                          <button type="submit" className="button-primary flex-1">Salvar</button>
                          <button type="button" popoverTargetAction="hide" popoverTarget={`edit-supplier-${s.id}`} className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-fg">Cancelar</button>
                        </div>
                      </form>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-10 text-center text-muted">Nenhum fornecedor cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AnimatedShell>
  );
}
