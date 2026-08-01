import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.siteSettings.upsert({
        where: { key: 'fb_page_id' },
        update: { value: '869754449565702' },
        create: { key: 'fb_page_id', value: '869754449565702', category: 'marketing' }
    });

    console.log('Page ID saved successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
