import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      status: true,
      total: true
    }
  });

  const caByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + order.total;
    acc.TOTAL = (acc.TOTAL || 0) + order.total;
    return acc;
  }, {} as Record<string, number>);

  console.log("=== TOUS LES STATUTS ===");
  console.log(caByStatus);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
