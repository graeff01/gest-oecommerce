import { date, money } from "@/lib/format";

type CollectionMessageInput = {
  customerName: string;
  amount: number;
  dueDate?: Date | string | null;
  reference?: string;
};

type PostSaleMessageInput = {
  customerName: string;
  orderCode?: string;
  total?: number;
  items?: string | null;
};

type RecoveryMessageInput = {
  customerName: string;
  daysInactive?: number | null;
  lastPurchase?: string | null;
};

type ProductPromotionMessageInput = {
  productName: string;
  price?: number | null;
  stock?: number | null;
  daysWithoutSale?: number | null;
};

export function normalizeBrazilPhone(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function whatsappUrl(phone: string | null | undefined, message: string) {
  const normalized = normalizeBrazilPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function whatsappShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function friendlyName(name: string) {
  return name.trim().split(/\s+/)[0] || "Cliente";
}

export function buildCollectionMessage(input: CollectionMessageInput) {
  const due = input.dueDate ? `, que venceu/vai vencer em ${date(input.dueDate)}` : "";
  const reference = input.reference ? ` do pedido ${input.reference}` : "";
  return `Oi, ${friendlyName(input.customerName)}! Te chamando rapidinho sobre o valor de ${money(input.amount)}${reference}${due}. Me avisa por aqui quando conseguir acertar ou se preferir combinar outro dia.`;
}

export function buildPostSaleMessage(input: PostSaleMessageInput) {
  const order = input.orderCode ? ` do pedido ${input.orderCode}` : "";
  const items = input.items ? ` (${input.items})` : "";
  return `Oi, ${friendlyName(input.customerName)}! Passando para saber se deu tudo certo com sua compra${order}${items}. Gostou das pecas? Se precisar trocar tamanho, tirar duvida ou quiser ver novidades parecidas, pode me chamar por aqui.`;
}

export function buildRecoveryMessage(input: RecoveryMessageInput) {
  const gap = input.daysInactive && input.daysInactive > 0 ? ` Faz um tempinho que voce nao aparece por aqui` : "Faz um tempinho que nao falamos";
  const last = input.lastPurchase ? ` desde aquela compra de ${input.lastPurchase}` : "";
  return `Oi, ${friendlyName(input.customerName)}! ${gap}${last}. Chegou coisa nova e acho que tem algumas opcoes que combinam com voce. Quer que eu te mande umas fotos por aqui?`;
}

export function buildProductPromotionMessage(input: ProductPromotionMessageInput) {
  const price = typeof input.price === "number" ? ` A partir de ${money(input.price)}.` : "";
  const urgency = input.stock && input.stock > 0 ? ` Tenho ${input.stock} unidade${input.stock === 1 ? "" : "s"} disponivel${input.stock === 1 ? "" : "s"}.` : "";
  const hook = input.daysWithoutSale && input.daysWithoutSale >= 60
    ? " Estou fazendo uma condicao especial para girar essa peca."
    : " Vale a pena conferir essa peca.";
  return `Passando para mostrar: ${input.productName}.${price}${urgency}${hook} Quer que eu te mande foto e detalhes?`;
}
