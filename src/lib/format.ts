/** Converte "YYYY-MM-DD" para início do dia em Brasília (UTC-3) */
export function startOfDayBRT(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00-03:00`);
}

/** Converte "YYYY-MM-DD" para fim do dia em Brasília (UTC-3) */
export function endOfDayBRT(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999-03:00`);
}

export function money(value: number | string | { toString(): string }) {
  const amount = Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function date(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function greeting(now: Date = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}
