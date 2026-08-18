import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const post = await prisma.post.findFirst({
        where: { slug: 'iktub-hatta-la-yakuluni-al-shaytan' },
        select: { title: true, authorName: true, authorId: true, author: { select: { fullName: true } } }
    });
    console.log(post);
}

main().finally(() => prisma.$disconnect());
