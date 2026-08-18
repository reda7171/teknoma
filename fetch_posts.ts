import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const posts = await prisma.post.findMany({
        take: 5,
        select: { id: true, title: true }
    });
    console.log(posts);
}

main().finally(() => prisma.$disconnect());
