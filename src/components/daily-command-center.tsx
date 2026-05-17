import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Flame, MessageCircle, PackageSearch, Sparkles } from "lucide-react";
import { money } from "@/lib/format";
import { buildProductPromotionMessage, buildRecoveryMessage, whatsappShareUrl, whatsappUrl } from "@/lib/whatsapp";

type Action = {
  type: "danger" | "warning" | "primary" | "success";
  title: string;
  detail: string;
  href: string;
};

type OnboardingItem = {
  key: string;
  label: string;
  done: boolean;
};

type CampaignProduct = {
  id: string;
  name: string;
  category: string;
  stock: number;
  minPrice: number;
  sold30: number;
  sold90: number;
  daysWithoutSale: number | null;
};

type CampaignCustomer = {
  id: string;
  name: string;
  phone: string | null;
  daysInactive: number | null;
  lastOrderCode: string | null;
  lastOrderTotal: number | null;
};

function tone(action: Action["type"]) {
  if (action === "danger") return "border-danger/25 bg-danger-soft text-danger";
  if (action === "warning") return "border-warning/25 bg-warning-soft text-warning";
  if (action === "success") return "border-success/25 bg-success-soft text-success";
  return "border-primary/25 bg-primary-soft text-primary";
}

export function DailyCommandCenter({
  actions,
  onboarding,
  stagnantProducts,
  bestSellers,
  inactiveCustomers
}: {
  actions: Action[];
  onboarding: OnboardingItem[];
  stagnantProducts: CampaignProduct[];
  bestSellers: CampaignProduct[];
  inactiveCustomers: CampaignCustomer[];
}) {
  const doneCount = onboarding.filter((item) => item.done).length;
  const progress = Math.round((doneCount / Math.max(onboarding.length, 1)) * 100);
  const featuredProduct = stagnantProducts[0];
  const featuredCustomer = inactiveCustomers[0];

  return (
    <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
      <div className="surface-card overflow-hidden">
        <div className="border-b border-border p-5">
          <p className="eyebrow">Central do dia</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-fg">O que fazer agora</h2>
              <p className="mt-1 text-[0.82rem] text-muted">Acoes praticas para vender, cobrar e proteger o caixa.</p>
            </div>
            <Link href="/vendas" className="button-primary w-full sm:w-auto">
              Nova venda
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:p-5">
          {actions.length ? actions.slice(0, 6).map((action) => (
            <Link
              key={`${action.title}-${action.href}`}
              href={action.href}
              className="group grid gap-3 rounded-xl border border-border bg-surface-2/35 p-4 transition hover:border-primary/30 hover:bg-primary-soft/35 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl border ${tone(action.type)}`}>
                <Sparkles size={16} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-fg">{action.title}</p>
                <p className="mt-0.5 text-[0.8rem] text-muted">{action.detail}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-primary">
                Agir
                <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          )) : (
            <div className="rounded-xl border border-dashed border-border bg-surface-2/35 p-6 text-center">
              <CheckCircle2 className="mx-auto text-success" size={26} />
              <p className="mt-3 font-semibold text-fg">Operacao em dia.</p>
              <p className="mt-1 text-[0.82rem] text-muted">Sem cobrancas urgentes, estoque critico ou campanha parada agora.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="surface-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Onboarding</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Primeiros passos</h2>
            </div>
            <span className="status-pill pill-primary">{progress}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-2" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 grid gap-2">
            {onboarding.map((item) => (
              <div key={item.key} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/35 px-3 py-2">
                {item.done ? <CheckCircle2 size={15} className="text-success" /> : <Circle size={15} className="text-muted" />}
                <span className={`text-[0.8rem] font-semibold ${item.done ? "text-fg" : "text-muted"}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="border-b border-border p-5">
            <p className="eyebrow">Campanhas simples</p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg">Vender com o que ja tem</h2>
          </div>
          <div className="grid gap-3 p-5">
            {featuredProduct ? (
              <a
                href={whatsappShareUrl(buildProductPromotionMessage({
                  productName: featuredProduct.name,
                  price: featuredProduct.minPrice,
                  stock: featuredProduct.stock,
                  daysWithoutSale: featuredProduct.daysWithoutSale
                }))}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-warning/25 bg-warning-soft/45 p-4 transition hover:border-warning/40"
              >
                <div className="flex items-center gap-2 text-warning">
                  <Flame size={15} />
                  <p className="text-[0.74rem] font-semibold uppercase tracking-wide">Divulgar parado</p>
                </div>
                <p className="mt-2 font-display text-base font-semibold text-fg">{featuredProduct.name}</p>
                <p className="mt-1 text-[0.78rem] text-muted">{featuredProduct.stock} em estoque · {money(featuredProduct.minPrice)}</p>
              </a>
            ) : null}

            {bestSellers[0] ? (
              <Link href="/produtos" className="rounded-xl border border-success/25 bg-success-soft/35 p-4 transition hover:border-success/40">
                <div className="flex items-center gap-2 text-success">
                  <PackageSearch size={15} />
                  <p className="text-[0.74rem] font-semibold uppercase tracking-wide">Aproveitar campeao</p>
                </div>
                <p className="mt-2 font-display text-base font-semibold text-fg">{bestSellers[0].name}</p>
                <p className="mt-1 text-[0.78rem] text-muted">{bestSellers[0].sold30} vendas em 30 dias · estoque {bestSellers[0].stock}</p>
              </Link>
            ) : null}

            {featuredCustomer ? (
              <a
                href={whatsappUrl(featuredCustomer.phone, buildRecoveryMessage({
                  customerName: featuredCustomer.name,
                  daysInactive: featuredCustomer.daysInactive,
                  lastPurchase: featuredCustomer.lastOrderCode
                })) ?? "/clientes"}
                target={featuredCustomer.phone ? "_blank" : undefined}
                rel={featuredCustomer.phone ? "noopener noreferrer" : undefined}
                className="rounded-xl border border-primary/25 bg-primary-soft/35 p-4 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-2 text-primary">
                  <MessageCircle size={15} />
                  <p className="text-[0.74rem] font-semibold uppercase tracking-wide">Recuperar cliente</p>
                </div>
                <p className="mt-2 font-display text-base font-semibold text-fg">{featuredCustomer.name}</p>
                <p className="mt-1 text-[0.78rem] text-muted">
                  {featuredCustomer.daysInactive === null ? "Nunca comprou" : `${featuredCustomer.daysInactive} dias sem comprar`}
                </p>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
