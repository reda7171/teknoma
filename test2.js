const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('SHIPPED:', await prisma.order.count({ where: { status: 'SHIPPED', expenseId: null } }));
  console.log('DELIVERED:', await prisma.order.count({ where: { status: 'DELIVERED', expenseId: null } }));
}
main().catch(console.error).finally(() => prisma.$disconnect());
