"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/lib/constants";

type Order = {
  id: string;
  code: string;
  status: string;
  total: number;
  createdAt: string;
  channel: string;
  paymentMethod: string;
};

type Props = {
  customerId: string;
  orders: Order[];
  children: React.ReactNode; // the main <tr> cells
};

function money(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function dt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export function CustomerOrdersRow({ orders, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        {children}
        <td className="w-6">
          <button
            type="button"
            className="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:text-fg"
            aria-label={open ? "Recolher pedidos" : "Ver pedidos"}
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
      </tr>
      {open && (
        orders.length === 0 ? (
          <tr className="bg-surface-2/30">
            <td colSpan={7} className="px-8 py-3 text-[0.78rem] text-muted italic">Nenhum pedido registrado para este cliente.</td>
          </tr>
        ) : (
          orders.map((order) => (
            <tr key={order.id} className="bg-surface-2/30">
              <td className="pl-8 text-[0.76rem] font-semibold text-fg" colSpan={2}>↳ {order.code}</td>
              <td className="text-[0.76rem] text-muted">{order.channel}</td>
              <td>
                <span className={`text-[0.72rem] ${ORDER_STATUS_TONES[order.status] ?? "status-pill"}`}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
              </td>
              <td className="text-right text-[0.76rem] font-semibold text-fg">{money(order.total)}</td>
              <td className="text-[0.76rem] text-muted">{dt(order.createdAt)}</td>
              <td></td>
            </tr>
          ))
        )
      )}
    </>
  );
}
