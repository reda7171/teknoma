import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const books = await prisma.book.findMany({
        take: 5,
        select: { id: true, title: true, author: true }
    });
    console.log(books);
}

main().finally(() => prisma.$disconnect());
