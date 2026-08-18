import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function getRandomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
    console.log('Randomizing Review dates...');
    const reviews = await prisma.review.findMany();
    
    // We'll spread the dates over the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (const review of reviews) {
        await prisma.review.update({
            where: { id: review.id },
            data: { createdAt: getRandomDate(thirtyDaysAgo, now) }
        });
    }

    console.log('Randomizing Comment dates...');
    const comments = await prisma.comment.findMany();
    
    for (const comment of comments) {
        await prisma.comment.update({
            where: { id: comment.id },
            data: { createdAt: getRandomDate(thirtyDaysAgo, now) }
        });
    }

    console.log('Dates have been randomized successfully!');
}

main().finally(() => prisma.$disconnect());
