"use client";

import { useEffect, useRef, useState } from "react";

const PHRASES_BY_PERIOD = {
  dawn: {
    greeting: "Boa madrugada",
    endings: [
      "trabalhando cedo!",
      "o dia começa antes para quem quer mais.",
      "o sucesso não dorme.",
    ],
  },
  morning: {
    greeting: "Bom dia",
    endings: [
      "tudo sob controle.",
      "prontos para um ótimo dia?",
      "vamos fazer hoje valer.",
      "o caixa agradece a dedicação.",
    ],
  },
  afternoon: {
    greeting: "Boa tarde",
    endings: [
      "tudo sob controle.",
      "as vendas estão aquecidas?",
      "mais um turno produtivo.",
      "como estão os números hoje?",
    ],
  },
  evening: {
    greeting: "Boa noite",
    endings: [
      "tudo sob controle.",
      "encerrando o dia com chave de ouro?",
      "bora fechar o caixa bem.",
      "os resultados de hoje foram bons?",
    ],
  },
} as const;

function getPeriod() {
  const h = new Date().getHours();
  if (h < 5) return "dawn";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function pickEnding(name: string, period: keyof typeof PHRASES_BY_PERIOD) {
  const endings = PHRASES_BY_PERIOD[period].endings;
  const idx = Math.floor(Math.random() * endings.length);
  const greeting = PHRASES_BY_PERIOD[period].greeting;
  const base = name ? `${greeting}, ${name}. ` : `${greeting}. `;
  return base + endings[idx];
}

export function DashboardGreeting({ name }: { name: string }) {
  const period = getPeriod();
  const fullText = useRef(pickEnding(name, period));
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fullText.current = pickEnding(name, period);
    setDisplayed("");
    setDone(false);

    let i = 0;
    // Small initial delay so page fade-in finishes first
    const startDelay = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(fullText.current.slice(0, i));
        if (i >= fullText.current.length) {
          clearInterval(interval);
          // Keep cursor visible briefly then hide
          setTimeout(() => setDone(true), 900);
        }
      }, 38);
      return () => clearInterval(interval);
    }, 280);

    return () => clearTimeout(startDelay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Split into greeting part and ending part for colour styling
  const greetingWord = PHRASES_BY_PERIOD[period].greeting;
  const prefix = name ? `${greetingWord}, ${name}. ` : `${greetingWord}. `;
  const shownPrefix = displayed.slice(0, Math.min(displayed.length, prefix.length));
  const shownSuffix = displayed.length > prefix.length ? displayed.slice(prefix.length) : "";

  return (
    <h1 className="heading-display mt-2 text-[2.1rem] md:text-[2.5rem]">
      {shownPrefix}
      {shownSuffix && <span className="text-gradient">{shownSuffix}</span>}
      {!done && (
        <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[2px] animate-pulse rounded-sm bg-primary align-middle" />
      )}
    </h1>
  );
}
