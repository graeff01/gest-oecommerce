import { ShieldCheck, Store, UsersRound } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "@/components/settings-tabs";
import { StoreSettingsForm } from "@/components/store-settings-form";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { createUserAction } from "../actions";

export default async function SettingsPage() {
  await connection();
  const [users, settings] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    getStoreSettings()
  ]);

  return (
    <AnimatedShell className="grid gap-6">
      <PageHeader
        title="Configurações"
        description="Personalize a identidade da loja, gerencie usuários e perfis de acesso."
      />

      <SettingsTabs
        defaultTab="store"
        tabs={[
          {
            id: "store",
            label: "Identidade da loja",
            icon: <Store size={16} strokeWidth={2.1} />,
            content: <StoreSettingsForm initialData={settings} />
          },
          {
            id: "users",
            label: "Usuários",
            icon: <UsersRound size={16} strokeWidth={2.1} />,
            content: (
              <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
                <form action={createUserAction} className="surface-card grid gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-success to-success/70 text-primary-fg">
                      <ShieldCheck size={17} strokeWidth={2.1} />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Novo usuário</h2>
                      <p className="text-[0.76rem] font-normal text-muted">Crie acessos com perfil específico.</p>
                    </div>
                  </div>
                  <label className="label">
                    Nome<input className="field" name="name" required />
                  </label>
                  <label className="label">
                    E-mail<input className="field" name="email" type="email" required />
                  </label>
                  <label className="label">
                    Senha<input className="field" name="password" type="password" minLength={8} required />
                  </label>
                  <label className="label">
                    Perfil
                    <select className="field" name="role">
                      <option value="ADMIN">Administrador</option>
                      <option value="FINANCE">Financeiro</option>
                      <option value="STOCK">Estoque</option>
                      <option value="SALES">Vendas</option>
                    </select>
                  </label>
                  <button className="button-primary">Criar usuário</button>
                </form>
                <div className="table-shell overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Perfil</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length ? (
                        users.map((user) => (
                          <tr key={user.id}>
                            <td className="font-semibold text-fg">{user.name}</td>
                            <td className="text-muted">{user.email}</td>
                            <td>
                              <span className="status-pill pill-primary">{user.role}</span>
                            </td>
                            <td>
                              <span className={user.active ? "status-pill" : "status-pill pill-neutral"}>
                                {user.active ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-muted">
                            Nenhum usuário cadastrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          }
        ]}
      />
    </AnimatedShell>
  );
}
