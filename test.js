const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const topCountriesRaw = await prisma.pageView.groupBy({
            by: ['country'],
            where: { url: { contains: '/blog' } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        });
        console.log(topCountriesRaw);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
