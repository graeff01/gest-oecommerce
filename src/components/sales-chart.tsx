"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/components/theme-provider";
import { money } from "@/lib/format";

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) return fallback;
  return `rgb(${value})`;
}

export function SalesChart({ data, compact = false }: { data: { day: string; total: number }[]; compact?: boolean }) {
  const { theme } = useTheme();
  const [colors, setColors] = useState({
    primary: "rgb(99, 80, 240)",
    primary2: "rgb(138, 100, 255)",
    muted: "rgb(142, 138, 152)",
    border: "rgb(226, 222, 213)",
    surface: "rgb(255, 254, 252)",
    fg: "rgb(28, 26, 36)"
  });

  useEffect(() => {
    setColors({
      primary: readVar("--primary", "99, 80, 240"),
      primary2: readVar("--primary-2", "138, 100, 255"),
      muted: readVar("--muted", "142, 138, 152"),
      border: readVar("--border", "226, 222, 213"),
      surface: readVar("--elevated", "252, 251, 248"),
      fg: readVar("--fg", "28, 26, 36")
    });
  }, [theme]);

  return (
    <div className={`${compact ? "h-[210px]" : "h-[300px]"} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="sales-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.primary} stopOpacity={0.42} />
              <stop offset="60%" stopColor={colors.primary} stopOpacity={0.12} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="sales-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.primary2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.muted, fontSize: 11, fontWeight: 500 }}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.muted, fontSize: 11, fontWeight: 500 }}
            tickFormatter={(value) => money(value).replace(",00", "").replace("R$", "R$ ")}
            width={70}
          />
          <Tooltip
            cursor={{ stroke: colors.primary, strokeWidth: 1, strokeDasharray: "4 4" }}
            formatter={(value) => money(Number(value))}
            contentStyle={{
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              background: colors.surface,
              boxShadow: "0 18px 42px -12px rgba(0,0,0,.18)",
              fontSize: 12,
              fontWeight: 500,
              color: colors.fg,
              padding: "8px 12px"
            }}
            labelStyle={{ color: colors.muted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: colors.fg }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="url(#sales-stroke)"
            strokeWidth={2.6}
            fill="url(#sales-gradient)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface, fill: colors.primary }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
