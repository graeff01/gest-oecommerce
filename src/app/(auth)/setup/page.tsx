import { redirect } from "next/navigation";
import { Sparkles, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Se já existe algum usuário, redireciona para login
  const count = await prisma.user.count();
  if (count > 0) redirect("/login");

  return (
    <main className="grid min-h-screen p-3 lg:grid-cols-[1.05fr_.95fr] lg:p-5">
      {/* painel esquerdo decorativo */}
      <section className="relative hidden overflow-hidden rounded-[28px] lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 70% at 10% 0%, rgb(99 80 240 / .95) 0%, transparent 60%), radial-gradient(50% 60% at 100% 100%, rgb(213 168 92 / .6) 0%, transparent 60%), linear-gradient(180deg, rgb(20 18 32) 0%, rgb(20 18 32) 100%)"
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <ShoppingBag size={22} strokeWidth={2.2} />
            </span>
            <strong className="font-display text-xl font-semibold tracking-tight">Gestão Ecommerce</strong>
          </div>

          <div>
            <p className="font-display text-3xl font-semibold leading-tight tracking-tight text-white/95">
              Bem-vinda ao seu sistema de gestão.
            </p>
            <p className="mt-4 text-[0.95rem] font-normal leading-6 text-white/60">
              Configure em segundos. Seus dados são seus — apenas você terá acesso.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                "Estoque com baixa automática a cada venda",
                "Financeiro integrado com crediário",
                "Relatórios e backup a qualquer momento"
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur">
                    <Sparkles size={12} strokeWidth={2.2} />
                  </span>
                  <span className="text-[0.88rem] font-normal text-white/75">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* formulário */}
      <section className="flex items-center justify-center px-2 py-10">
        <div className="w-full max-w-md">
          {/* logo mobile */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
              <ShoppingBag size={20} />
            </span>
            <strong className="font-display text-lg font-semibold tracking-tight text-fg">Gestão Ecommerce</strong>
          </div>

          <div className="surface-card relative overflow-hidden p-7 md:p-9">
            <span className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
            <span className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

            <span className="relative mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
              <Sparkles size={22} strokeWidth={2.1} />
            </span>
            <h2 className="relative font-display text-3xl font-semibold tracking-tight text-fg">
              Configuração inicial
            </h2>
            <p className="relative mt-2 text-[0.92rem] font-normal leading-6 text-muted">
              Crie o nome da sua loja e seu acesso de administrador. Isso só aparece uma vez.
            </p>
            <div className="relative mt-6">
              <SetupForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
