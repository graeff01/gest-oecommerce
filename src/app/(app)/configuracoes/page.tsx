import { AlertTriangle, DatabaseBackup, Download, ListChecks, ShieldCheck, Store, UserCircle, UsersRound } from "lucide-react";
import { connection } from "next/server";
import { AnimatedShell } from "@/components/animated-shell";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { ResponsiveFormPanel } from "@/components/responsive-form-panel";
import { SettingsTabs } from "@/components/settings-tabs";
import { StoreSettingsForm } from "@/components/store-settings-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { createUserAction, saveFinanceCategoriesAction, toggleUserActiveAction } from "../actions/settings";
import { DEFAULT_FINANCE_CATEGORIES } from "@/lib/settings";

export default async function SettingsPage() {
  await connection();
  const [currentUser, users, settings, counts] = await Promise.all([
    requireUser(),
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    getStoreSettings(),
    Promise.all([
      prisma.customer.count(),
      prisma.order.count(),
      prisma.product.count(),
      prisma.productVariant.count(),
      prisma.financialTransaction.count(),
      prisma.stockMovement.count()
    ]).then(([customers, orders, products, variants, transactions, movements]) => ({
      customers, orders, products, variants, transactions, movements
    }))
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
            id: "profile",
            label: "Minha conta",
            icon: <UserCircle size={16} strokeWidth={2.1} />,
            content: (
              <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
                <div className="surface-card grid gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
                      <UserCircle size={17} strokeWidth={2.1} />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Minha conta</h2>
                      <p className="text-[0.76rem] font-normal text-muted">Altere seu nome, e-mail ou senha de acesso.</p>
                    </div>
                  </div>
                  <ProfileForm initialName={currentUser.name} initialEmail={currentUser.email} />
                </div>
                <div className="surface-card grid content-start gap-4 p-5">
                  <p className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">Sobre segurança</p>
                  <div className="grid gap-3">
                    {[
                      { title: "Senha criptografada", desc: "Sua senha nunca é armazenada em texto simples — apenas um hash seguro." },
                      { title: "Sessão por 8 horas", desc: "Após esse período você precisará entrar novamente automaticamente." },
                      { title: "Acesso por perfil", desc: "Cada usuário tem permissões de acordo com seu perfil: Admin, Financeiro, Estoque ou Vendas." }
                    ].map(({ title, desc }) => (
                      <div key={title} className="rounded-xl border border-border bg-surface-2/40 px-4 py-3">
                        <p className="text-[0.86rem] font-semibold text-fg">{title}</p>
                        <p className="mt-0.5 text-[0.78rem] leading-5 text-muted">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          },
          {
            id: "categories",
            label: "Categorias",
            icon: <ListChecks size={16} strokeWidth={2.1} />,
            content: (
              <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
                <ResponsiveFormPanel title="Editar categorias">
                <form action={saveFinanceCategoriesAction} className="surface-card grid gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent/70 text-fg">
                      <ListChecks size={17} strokeWidth={2.1} />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Categorias financeiras</h2>
                      <p className="text-[0.76rem] font-normal text-muted">Uma categoria por linha. Usadas no lançamento de receitas e gastos.</p>
                    </div>
                  </div>
                  <label className="label">
                    Categorias (uma por linha)
                    <textarea
                      className="field min-h-48 font-mono text-sm"
                      name="categories"
                      defaultValue={
                        (settings.financeCategories.length ? settings.financeCategories : DEFAULT_FINANCE_CATEGORIES).join("\n")
                      }
                    />
                  </label>
                  <button className="button-primary">Salvar categorias</button>
                </form>
                </ResponsiveFormPanel>
                <div className="surface-card grid content-start gap-4 p-5">
                  <p className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">Categorias padrão</p>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_FINANCE_CATEGORIES.map((c) => (
                      <span key={c} className="chip">{c}</span>
                    ))}
                  </div>
                  <p className="text-[0.78rem] leading-5 text-muted">
                    As categorias padrão já estão pré-carregadas. Você pode editá-las, remover ou adicionar novas conforme sua necessidade.
                    Categorias consistentes permitem filtros e relatórios mais precisos.
                  </p>
                </div>
              </div>
            )
          },
          {
            id: "backup",
            label: "Backup",
            icon: <DatabaseBackup size={16} strokeWidth={2.1} />,
            content: (
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                {/* painel de aviso */}
                <div className="surface-card grid gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-warning to-warning/70 text-primary-fg">
                      <DatabaseBackup size={17} strokeWidth={2.1} />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">Backup dos dados</h2>
                      <p className="text-[0.76rem] font-normal text-muted">Exporta tudo em um arquivo JSON completo.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" strokeWidth={2.1} />
                    <div className="text-[0.82rem] leading-5 text-muted">
                      <strong className="font-semibold text-fg">Plano Railway sem backup automático.</strong> Faça o download
                      abaixo regularmente e guarde o arquivo em um lugar seguro (Google Drive, e-mail ou HD externo).
                      Recomendamos <strong className="text-fg">pelo menos uma vez por semana</strong>.
                    </div>
                  </div>

                  <a
                    href="/api/backup"
                    download
                    className="button-primary flex items-center justify-center gap-2"
                  >
                    <Download size={16} strokeWidth={2.2} />
                    Baixar backup completo (.json)
                  </a>

                  <p className="text-[0.72rem] text-muted">
                    O arquivo contém todos os dados: clientes, pedidos, produtos, estoque, financeiro e movimentações.
                    Apenas administradores podem gerar o backup.
                  </p>
                </div>

                {/* o que está no backup */}
                <div className="surface-card grid content-start gap-4 p-5">
                  <p className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted">O que está incluído</p>
                  <div className="grid gap-2">
                    {[
                      { label: "Clientes", value: counts.customers },
                      { label: "Pedidos", value: counts.orders },
                      { label: "Produtos", value: counts.products },
                      { label: "Variações (SKUs)", value: counts.variants },
                      { label: "Lançamentos financeiros", value: counts.transactions },
                      { label: "Movimentações de estoque", value: counts.movements }
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-4 py-2.5">
                        <span className="text-[0.86rem] font-medium text-muted">{label}</span>
                        <span className="font-display text-base font-semibold text-fg">{value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[0.72rem] text-muted">
                    Inclui também: fornecedores, compras, crediário e configurações da loja.
                  </p>
                </div>
              </div>
            )
          },
          {
            id: "users",
            label: "Usuários",
            icon: <UsersRound size={16} strokeWidth={2.1} />,
            content: (
              <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
                <ResponsiveFormPanel title="Novo usuário">
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
                </ResponsiveFormPanel>
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
                            <td className="max-w-[12rem] truncate font-semibold text-fg">{user.name}</td>
                            <td className="max-w-[14rem] truncate text-muted">{user.email}</td>
                            <td>
                              <span className="status-pill pill-primary">{user.role}</span>
                            </td>
                            <td>
                              <form action={toggleUserActiveAction} className="flex items-center gap-2">
                                <input type="hidden" name="id" value={user.id} />
                                <button type="submit" className={`status-pill whitespace-nowrap transition hover:opacity-70 ${user.active ? "" : "pill-neutral"}`}>
                                  {user.active ? "Ativo" : "Inativo"}
                                </button>
                              </form>
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
