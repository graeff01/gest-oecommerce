export type SalesPoint = { date: string; orders: number; revenue: number };

function moneyCompact(n: number) {
  if (n >= 1000000) return `R$ ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return `R$ ${n.toFixed(0)}`;
}

export function SalesChart({
  data,
  metric = "revenue",
  height = 200
}: {
  data: SalesPoint[];
  metric?: "revenue" | "orders";
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-xl border border-dashed border-border bg-surface-2/30 text-[0.78rem] text-muted">
        Sem dados de vendas para o periodo
      </div>
    );
  }

  const values = data.map((d) => (metric === "revenue" ? d.revenue : d.orders));
  const max = Math.max(...values, 1);
  const w = 600;
  const h = height;
  const padX = 32;
  const padY = 20;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = padX + i * step;
    const y = padY + plotH - (v / max) * plotH;
    return { x, y, value: v, date: data[i].date };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${padX + plotW} ${padY + plotH} L ${padX} ${padY + plotH} Z`;

  // grid lines (4 horizontal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const y = padY + plotH - p * plotH;
    return { y, label: moneyCompact(max * p) };
  });

  // x labels - show every Nth
  const labelEvery = Math.max(1, Math.floor(data.length / 7));
  const totalValue = values.reduce((s, v) => s + v, 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[0.66rem] font-bold uppercase tracking-widest text-subtle">
          {metric === "revenue" ? "Receita por dia (30d)" : "Pedidos por dia (30d)"}
        </p>
        <p className="text-[0.76rem] font-bold text-fg">
          Total:{" "}
          <span className="text-primary">
            {metric === "revenue" ? moneyCompact(totalValue) : totalValue.toLocaleString("pt-BR")}
          </span>
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-auto w-full" style={{ maxHeight: h }}>
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(99 80 240)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="rgb(99 80 240)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={padX + plotW}
              y1={g.y}
              y2={g.y}
              stroke="rgb(var(--border))"
              strokeWidth="0.6"
              strokeDasharray="3 3"
            />
            <text
              x={padX - 6}
              y={g.y + 3}
              textAnchor="end"
              fontSize="9"
              fill="rgb(var(--subtle))"
              fontWeight="600"
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* area */}
        <path d={areaPath} fill="url(#chart-gradient)" />

        {/* line */}
        <path d={linePath} fill="none" stroke="rgb(99 80 240)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.5" fill="rgb(99 80 240)" />
            <title>
              {new Date(p.date).toLocaleDateString("pt-BR")}: {metric === "revenue" ? moneyCompact(p.value) : p.value}
            </title>
          </g>
        ))}

        {/* x labels */}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text
              key={`l-${i}`}
              x={p.x}
              y={padY + plotH + 14}
              textAnchor="middle"
              fontSize="9"
              fill="rgb(var(--subtle))"
              fontWeight="600"
            >
              {new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

export function HealthHistoryChart({
  history,
  height = 100
}: {
  history: { capturedAt: Date; healthScore: number }[];
  height?: number;
}) {
  if (history.length === 0) {
    return (
      <div className="grid h-24 place-items-center rounded-xl border border-dashed border-border bg-surface-2/30 text-[0.74rem] text-muted">
        Sem historico. Capture o primeiro snapshot.
      </div>
    );
  }
  const values = history.map((h) => h.healthScore);
  const w = 400;
  const h = height;
  const padX = 6;
  const padY = 6;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const step = history.length > 1 ? plotW / (history.length - 1) : 0;
  const points = values.map((v, i) => ({
    x: padX + i * step,
    y: padY + plotH - (v / 100) * plotH
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${padX + plotW} ${padY + plotH} L ${padX} ${padY + plotH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="health-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(38 159 113)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="rgb(38 159 113)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#health-gradient)" />
      <path d={path} fill="none" stroke="rgb(38 159 113)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
