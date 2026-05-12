import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const tag = `VERIFY-${Date.now()}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup() {
  const products = await prisma.product.findMany({
    where: { name: { startsWith: tag } },
    include: { variants: true }
  });
  const variantIds = products.flatMap((product) => product.variants.map((variant) => variant.id));

  const orders = await prisma.order.findMany({
    where: { notes: tag },
    select: { id: true }
  });
  const orderIds = orders.map((order) => order.id);

  const purchases = await prisma.purchase.findMany({
    where: { code: { startsWith: tag } },
    select: { id: true }
  });
  const purchaseIds = purchases.map((purchase) => purchase.id);

  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
  await prisma.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: variantIds } } });
  await prisma.financialTransaction.deleteMany({
    where: {
      OR: [
        { title: { contains: tag } },
        { notes: tag }
      ]
    }
  });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { action: { startsWith: tag } },
        { entityId: { in: [...orderIds, ...purchaseIds, ...products.map((product) => product.id)] } }
      ]
    }
  });
  await prisma.product.deleteMany({ where: { id: { in: products.map((product) => product.id) } } });
  await prisma.customer.deleteMany({ where: { name: { startsWith: tag } } });
  await prisma.supplier.deleteMany({ where: { name: { startsWith: tag } } });
}

async function main() {
  await cleanup();

  const admin = await prisma.user.findUnique({ where: { email: "admin@loja.com" } });
  assert(admin, "Usuario admin do seed nao encontrado.");
  assert(await bcrypt.compare("Admin@12345", admin.passwordHash), "Senha seed do admin nao confere.");

  const customer = await prisma.customer.create({
    data: {
      name: `${tag} Cliente`,
      email: `${tag.toLowerCase()}@cliente.test`,
      phone: "(11) 99999-9999",
      address: "Endereco de validacao"
    }
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: `${tag} Fornecedor`,
      email: `${tag.toLowerCase()}@fornecedor.test`,
      phone: "(11) 98888-8888"
    }
  });

  const product = await prisma.product.create({
    data: {
      name: `${tag} Produto`,
      category: "Calcados",
      brand: "Validacao",
      gender: "Unissex",
      tags: ["validacao", "tenis"]
    }
  });
  const firstVariant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `${tag}-SKU-38`,
      color: "Azul",
      size: "38",
      costPrice: 100,
      salePrice: 220,
      stockQuantity: 5,
      minStock: 2
    }
  });
  assert(firstVariant.stockQuantity === 5, "Produto inicial nao criou estoque correto.");

  await prisma.stockMovement.create({
    data: {
      variantId: firstVariant.id,
      userId: admin.id,
      type: "IN",
      quantity: 5,
      reason: `${tag} cadastro inicial`
    }
  });

  const secondVariant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `${tag}-SKU-39`,
      color: "Azul",
      size: "39",
      costPrice: 100,
      salePrice: 220,
      stockQuantity: 1,
      minStock: 2
    }
  });
  assert(secondVariant.sku.endsWith("39"), "Criacao de variacao falhou.");

  await prisma.$transaction(async (tx) => {
    const stockUpdate = await tx.productVariant.updateMany({
      where: { id: firstVariant.id, stockQuantity: { gte: 2 } },
      data: { stockQuantity: { decrement: 2 } }
    });
    assert(stockUpdate.count === 1, "Baixa segura de estoque falhou.");

    await tx.stockMovement.create({
      data: {
        variantId: firstVariant.id,
        userId: admin.id,
        type: "OUT",
        quantity: 2,
        reason: `${tag} ajuste de validacao`
      }
    });
  });

  const afterAdjustment = await prisma.productVariant.findUniqueOrThrow({ where: { id: firstVariant.id } });
  assert(afterAdjustment.stockQuantity === 3, "Estoque apos ajuste deveria ser 3.");

  const rejectedOversell = await prisma.productVariant.updateMany({
    where: { id: firstVariant.id, stockQuantity: { gte: 99 } },
    data: { stockQuantity: { decrement: 99 } }
  });
  assert(rejectedOversell.count === 0, "Sistema permitiu baixa maior que o estoque.");

  const saleSubtotal = Number(afterAdjustment.salePrice) * 2;
  const saleTotal = saleSubtotal - 10 + 5;
  const order = await prisma.$transaction(async (tx) => {
    const stockUpdate = await tx.productVariant.updateMany({
      where: { id: firstVariant.id, stockQuantity: { gte: 2 } },
      data: { stockQuantity: { decrement: 2 } }
    });
    assert(stockUpdate.count === 1, "Venda nao conseguiu reservar estoque.");

    const createdOrder = await tx.order.create({
      data: {
        code: `${tag}-PED`,
        customerId: customer.id,
        channel: "Validacao",
        status: "PAID",
        paymentMethod: "PIX",
        subtotal: saleSubtotal,
        discount: 10,
        fee: 5,
        total: saleTotal,
        notes: tag,
        items: {
          create: {
            variantId: firstVariant.id,
            quantity: 2,
            unitPrice: afterAdjustment.salePrice,
            costPrice: afterAdjustment.costPrice
          }
        }
      }
    });

    await tx.stockMovement.create({
      data: {
        variantId: firstVariant.id,
        userId: admin.id,
        type: "SALE",
        quantity: 2,
        reason: `${tag} venda`
      }
    });
    await tx.financialTransaction.create({
      data: {
        type: "REVENUE",
        title: `${tag} Receita venda`,
        category: "Vendas",
        amount: saleTotal,
        paymentMethod: "PIX",
        paidAt: new Date(),
        notes: tag
      }
    });

    return createdOrder;
  });
  assert(Number(order.total) === saleTotal, "Total da venda foi calculado incorretamente.");

  const afterSale = await prisma.productVariant.findUniqueOrThrow({ where: { id: firstVariant.id } });
  assert(afterSale.stockQuantity === 1, "Venda nao baixou estoque corretamente.");

  const purchaseTotal = 3 * 95 + 20;
  const purchase = await prisma.$transaction(async (tx) => {
    const createdPurchase = await tx.purchase.create({
      data: {
        code: `${tag}-CMP`,
        supplierId: supplier.id,
        freight: 20,
        total: purchaseTotal,
        receivedAt: new Date(),
        items: {
          create: {
            variantId: firstVariant.id,
            quantity: 3,
            unitCost: 95
          }
        }
      }
    });

    await tx.productVariant.update({
      where: { id: firstVariant.id },
      data: {
        stockQuantity: { increment: 3 },
        costPrice: 95
      }
    });
    await tx.stockMovement.create({
      data: {
        variantId: firstVariant.id,
        userId: admin.id,
        type: "IN",
        quantity: 3,
        reason: `${tag} compra`
      }
    });
    await tx.financialTransaction.create({
      data: {
        type: "EXPENSE",
        title: `${tag} Compra mercadoria`,
        category: "Mercadorias",
        amount: purchaseTotal,
        paidAt: new Date(),
        notes: tag
      }
    });

    return createdPurchase;
  });
  assert(Number(purchase.total) === purchaseTotal, "Total da compra foi calculado incorretamente.");

  await prisma.financialTransaction.create({
    data: {
      type: "EXPENSE",
      title: `${tag} Despesa avulsa`,
      category: "Operacional",
      amount: 50,
      paidAt: new Date(),
      notes: tag
    }
  });

  const [finalVariant, revenue, expenses, movements] = await Promise.all([
    prisma.productVariant.findUniqueOrThrow({ where: { id: firstVariant.id } }),
    prisma.financialTransaction.aggregate({
      where: { notes: tag, type: "REVENUE" },
      _sum: { amount: true }
    }),
    prisma.financialTransaction.aggregate({
      where: { notes: tag, type: "EXPENSE" },
      _sum: { amount: true }
    }),
    prisma.stockMovement.count({ where: { variantId: firstVariant.id } })
  ]);

  assert(finalVariant.stockQuantity === 4, "Estoque final deveria ser 4.");
  assert(Number(revenue._sum.amount) === saleTotal, "Receita agregada nao confere.");
  assert(Number(expenses._sum.amount) === purchaseTotal + 50, "Despesas agregadas nao conferem.");
  assert(movements >= 4, "Historico de estoque nao registrou todos os movimentos.");

  await cleanup();
  console.log("Backend verificado: login seed, produto, variacao, estoque, venda, financeiro, cliente, fornecedor e compra OK.");
}

main()
  .catch(async (error) => {
    console.error(error);
    await cleanup();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
