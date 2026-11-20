import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.siteSettings.upsert({
        where: { key: 'fb_marketing_access_token' },
        update: { value: 'EAAdCrkYuZBvYBSOmShOi2oRGfTJVB2Bsa2VVlLeGqcHL9ToyXcmYLMdzVGHyQu2co2rBtC5YRhYGrnDrDQjabk6r9y9ZCaAWbpyFK0ZAikqle1gQZCV52Vjgq46DfRipYxsBZBnDv9caNSbs2D1wEleRJXPjc3RrZBYE4xZC7jFjlKRhqE3isDYQGlseimfkeYgONHbPP5ZC' },
        create: { key: 'fb_marketing_access_token', value: 'EAAdCrkYuZBvYBSOmShOi2oRGfTJVB2Bsa2VVlLeGqcHL9ToyXcmYLMdzVGHyQu2co2rBtC5YRhYGrnDrDQjabk6r9y9ZCaAWbpyFK0ZAikqle1gQZCV52Vjgq46DfRipYxsBZBnDv9caNSbs2D1wEleRJXPjc3RrZBYE4xZC7jFjlKRhqE3isDYQGlseimfkeYgONHbPP5ZC', category: 'marketing' }
    });

    await prisma.siteSettings.upsert({
        where: { key: 'fb_ad_account_id' },
        update: { value: 'act_1689060488816669' },
        create: { key: 'fb_ad_account_id', value: 'act_1689060488816669', category: 'marketing' }
    });

    console.log('Saved successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
