import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tr = await prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } });
  console.log('DELIVERED ONLY:', tr._sum.total);

  const trAll = await prisma.order.aggregate({ _sum: { total: true } });
  console.log('ALL ORDERS:', trAll._sum.total);

  const trValid = await prisma.order.aggregate({ where: { status: { notIn: ['CANCELLED', 'RETURNED'] } }, _sum: { total: true } });
  console.log('VALID ORDERS:', trValid._sum.total);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
