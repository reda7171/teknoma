const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.book.findMany({ where: { stock: { gt: 0 } }, take: 10, select: { id: true, title: true, image: true } }).then(console.log).finally(() => prisma.$disconnect());
