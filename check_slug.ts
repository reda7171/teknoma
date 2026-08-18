import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const post = await prisma.post.findFirst({
        where: {
            title: {
                contains: 'Best Personal Finance'
            }
        },
        select: { title: true, slug: true, language: true }
    });
    console.log(post);
}

main().finally(() => prisma.$disconnect());
