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
};

type RecoveryMessageInput = {
  customerName: string;
  daysInactive?: number | null;
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

export function buildCollectionMessage(input: CollectionMessageInput) {
  const due = input.dueDate ? ` com vencimento em ${date(input.dueDate)}` : "";
  const reference = input.reference ? ` referente a ${input.reference}` : "";
  return `Ola ${input.customerName}, tudo bem? Passando para lembrar que existe um valor em aberto de ${money(input.amount)}${reference}${due}. Se puder me dar um retorno, eu agradeco.`;
}

export function buildPostSaleMessage(input: PostSaleMessageInput) {
  const order = input.orderCode ? ` pelo pedido ${input.orderCode}` : "";
  const total = typeof input.total === "number" ? ` no valor de ${money(input.total)}` : "";
  return `Ola ${input.customerName}! Obrigado pela compra${order}${total}. Quando receber, me conta se deu tudo certo? Qualquer ajuste ou duvida pode me chamar por aqui.`;
}

export function buildRecoveryMessage(input: RecoveryMessageInput) {
  const gap = input.daysInactive && input.daysInactive > 0 ? ` Vi que ja faz ${input.daysInactive} dias desde sua ultima compra.` : "";
  return `Ola ${input.customerName}, tudo bem?${gap} Separei algumas novidades que podem fazer sentido para voce. Quer que eu te envie as opcoes por aqui?`;
}

export function buildProductPromotionMessage(input: ProductPromotionMessageInput) {
  const price = typeof input.price === "number" ? ` A partir de ${money(input.price)}.` : "";
  const urgency = input.stock && input.stock > 0 ? ` Tenho ${input.stock} unidade${input.stock === 1 ? "" : "s"} disponivel${input.stock === 1 ? "" : "s"}.` : "";
  const hook = input.daysWithoutSale && input.daysWithoutSale >= 60
    ? " Estou fazendo uma condicao especial para girar essa peca."
    : " Vale a pena conferir essa peca.";
  return `Passando para mostrar: ${input.productName}.${price}${urgency}${hook} Quer que eu te mande foto e detalhes?`;
}
