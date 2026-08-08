import { prisma } from './src/lib/prisma';
async function run() {
    const books = await prisma.book.findMany({ take: 5, select: { image: true } });
    console.log(books);
}
run();
