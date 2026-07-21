import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    const tokenSetting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } });
    if (!tokenSetting) return console.log("No telegram token found");
    
    const res = await fetch(`https://api.telegram.org/bot${tokenSetting.value}/getWebhookInfo`);
    const data = await res.json();
    console.log("Webhook Info:", data);
}

test().catch(console.error).finally(() => prisma.$disconnect());
