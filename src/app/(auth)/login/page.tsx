import { redirect } from "next/navigation";
import { ShieldCheck, ShoppingBag } from "lucide-react";
import { LoginForm } from "./login-form";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Primeiro acesso: nenhum usuário cadastrado → setup
  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  const settings = await getStoreSettings();
  const hasImage = Boolean(settings.loginImageUrl);

  return (
    <main className="grid min-h-screen p-3 lg:grid-cols-[1.05fr_.95fr] lg:p-5">
      <section className="relative hidden overflow-hidden rounded-[28px] bg-fg lg:block">
        {hasImage ? (
          <img
            src={settings.loginImageUrl ?? ""}
            alt={settings.storeName}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 70% at 10% 0%, rgb(99 80 240 / .9) 0%, transparent 60%), radial-gradient(50% 60% at 100% 100%, rgb(213 168 92 / .55) 0%, transparent 60%), linear-gradient(180deg, rgb(20 18 32) 0%, rgb(20 18 32) 100%)"
            }}
          />
        )}

        {/* overlay sempre presente, levemente diferente conforme tem imagem */}
        <div
          className="absolute inset-0"
          style={{
            background: hasImage
              ? "linear-gradient(180deg, rgb(20 18 32 / .12) 0%, rgb(20 18 32 / .55) 70%, rgb(20 18 32 / .82) 100%)"
              : "linear-gradient(180deg, rgb(20 18 32 / 0) 0%, rgb(20 18 32 / .35) 100%)"
          }}
        />

        <div className="absolute inset-0 flex flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/95 text-fg shadow-elev backdrop-blur">
              <ShoppingBag size={22} strokeWidth={2.2} />
            </span>
            <strong className="font-display text-xl font-semibold tracking-tight">{settings.storeName}</strong>
          </div>

          {settings.storeTagline ? (
            <p className="font-display text-2xl font-semibold leading-tight tracking-tight text-white/95">
              {settings.storeTagline}
            </p>
          ) : null}
        </div>
      </section>

      <section className="flex items-center justify-center px-2 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-2 text-primary-fg shadow-glow">
              <ShoppingBag size={20} />
            </span>
            <strong className="font-display text-lg font-semibold tracking-tight text-fg">{settings.storeName}</strong>
          </div>

          <div className="surface-card relative overflow-hidden p-7 md:p-9">
            <span className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
            <span className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

            <span className="relative mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-success-soft text-success">
              <ShieldCheck size={22} strokeWidth={2.1} />
            </span>
            <h2 className="relative font-display text-3xl font-semibold tracking-tight text-fg">Entrar</h2>
            <p className="relative mt-2 text-[0.92rem] font-normal leading-6 text-muted">
              Acesso protegido com senha criptografada e sessão por perfil.
            </p>
            <div className="relative mt-6">
              <LoginForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
