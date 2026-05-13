import { Building2 } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { createSupplierAction, updateSupplierAction, deleteSupplierAction } from "../actions";

export default async function SuppliersPage() {
  await connection();
  const suppliers = await prisma.supplier.findMany({ include: { purchases: true }, orderBy: { createdAt: "desc" } });

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Fornecedores"
        description="Organize fornecedores, contatos, prazos e histórico de compras de mercadoria."
      />
      <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <form action={createSupplierAction} className="surface-card grid gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-info to-primary text-primary-fg shadow-glow">
              <Building2 size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo fornecedor</h2>
              <p className="text-[0.76rem] font-normal text-muted">Cadastro com contato e dados fiscais.</p>
            </div>
          </div>
          <label className="label">
            Nome<input className="field" name="name" required />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">
              CNPJ/CPF<input className="field" name="document" />
            </label>
            <label className="label">
              Contato<input className="field" name="contact" />
            </label>
            <label className="label">
              Telefone<input className="field" name="phone" />
            </label>
            <label className="label">
              E-mail<input className="field" name="email" type="email" />
            </label>
          </div>
          <label className="label">
            Observações<textarea className="field min-h-20" name="notes" />
          </label>
          <button className="button-primary">Cadastrar fornecedor</button>
        </form>
        <div className="table-shell overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>Compras</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length ? (
                suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="font-semibold text-fg">{supplier.name}</td>
                    <td>{supplier.contact || supplier.email || "-"}</td>
                    <td>{supplier.phone || "-"}</td>
                    <td>
                      <span className="chip">{supplier.purchases.length}</span>
                    </td>
                    <td className="text-muted">{supplier.notes || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted">
                    Nenhum fornecedor cadastrado ainda.
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
