import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral" | "accent";

const toneConfig: Record<
  Tone,
  {
    card: string;
    iconWrap: string;
    iconColor: string;
    valueClass: string;
    labelClass: string;
    detailClass: string;
    decoration: string;
    accent: string;
  }
> = {
  primary: {
    card: "border-primary/30 bg-gradient-to-br from-primary/95 via-primary to-primary-2 text-primary-fg",
    iconWrap: "bg-white/15 backdrop-blur-sm",
    iconColor: "text-primary-fg",
    valueClass: "text-primary-fg",
    labelClass: "text-primary-fg/72",
    detailClass: "text-primary-fg/64",
    decoration:
      "before:absolute before:inset-0 before:bg-[radial-gradient(80%_60%_at_100%_0%,rgba(255,255,255,.18),transparent_60%)] before:pointer-events-none",
    accent: "bg-accent/90 text-fg"
  },
  success: {
    card: "border-success/15 bg-surface text-fg",
    iconWrap: "bg-success-soft",
    iconColor: "text-success",
    valueClass: "text-fg",
    labelClass: "text-muted",
    detailClass: "text-subtle",
    decoration: "",
    accent: "bg-success-soft text-success"
  },
  warning: {
    card: "border-warning/15 bg-surface text-fg",
    iconWrap: "bg-warning-soft",
    iconColor: "text-warning",
    valueClass: "text-fg",
    labelClass: "text-muted",
    detailClass: "text-subtle",
    decoration: "",
    accent: "bg-warning-soft text-warning"
  },
  danger: {
    card: "border-danger/15 bg-surface text-fg",
    iconWrap: "bg-danger-soft",
    iconColor: "text-danger",
    valueClass: "text-fg",
    labelClass: "text-muted",
    detailClass: "text-subtle",
    decoration: "",
    accent: "bg-danger-soft text-danger"
  },
  neutral: {
    card: "border-border bg-surface text-fg",
    iconWrap: "bg-surface-2",
    iconColor: "text-muted",
    valueClass: "text-fg",
    labelClass: "text-muted",
    detailClass: "text-subtle",
    decoration: "",
    accent: "bg-surface-2 text-muted"
  },
  accent: {
    card: "border-accent/30 bg-gradient-to-br from-accent/90 to-accent-2 text-fg",
    iconWrap: "bg-fg/10 backdrop-blur-sm",
    iconColor: "text-fg",
    valueClass: "text-fg",
    labelClass: "text-fg/70",
    detailClass: "text-fg/60",
    decoration:
      "before:absolute before:inset-0 before:bg-[radial-gradient(80%_60%_at_100%_0%,rgba(255,255,255,.22),transparent_60%)] before:pointer-events-none",
    accent: "bg-fg/10 text-fg"
  }
};

// compatibilidade com tones antigos
function normalizeTone(tone: string): Tone {
  if (tone === "dark") return "primary";
  if (tone === "sage") return "success";
  if (tone === "brass") return "warning";
  if (tone === "clay") return "danger";
  if (tone === "primary" || tone === "success" || tone === "warning" || tone === "danger" || tone === "neutral" || tone === "accent") {
    return tone as Tone;
  }
  return "neutral";
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
  trend,
  variant = "auto"
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: Tone | "dark" | "sage" | "brass" | "clay";
  trend?: { value: string; positive?: boolean };
  variant?: "auto" | "soft";
}) {
  const t = normalizeTone(tone);
  const cfg = toneConfig[t];
  const isFilled = t === "primary" || t === "accent";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elev ${cfg.card} ${cfg.decoration}`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[0.78rem] font-medium ${cfg.labelClass}`}>{label}</p>
          <strong
            className={`mt-3 block font-display text-[1.7rem] font-semibold leading-none tracking-tight ${cfg.valueClass}`}
          >
            {value}
          </strong>
          <span className={`mt-2 block text-[0.78rem] font-normal ${cfg.detailClass}`}>{detail}</span>

          {trend ? (
            <span
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                isFilled
                  ? "bg-white/15 text-primary-fg"
                  : trend.positive === false
                    ? "bg-danger-soft text-danger"
                    : "bg-success-soft text-success"
              }`}
            >
              <ArrowUpRight size={11} strokeWidth={2.4} className={trend.positive === false ? "rotate-90" : ""} />
              {trend.value}
            </span>
          ) : null}
        </div>

        <span
          className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl transition group-hover:scale-105 ${cfg.iconWrap}`}
        >
          <Icon size={20} strokeWidth={2.1} className={cfg.iconColor} />
        </span>
      </div>

      {/* glow inferior sutil em filled */}
      {isFilled ? (
        <span className="pointer-events-none absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-white/12 blur-3xl" />
      ) : null}
    </div>
  );
}
