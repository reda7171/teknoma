import { prisma } from './src/lib/prisma';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    const lastCheckSetting = await prisma.siteSettings.findUnique({ where: { key: 'jumia_last_order_check' } })
    console.log("DB value:", lastCheckSetting?.value);

    let lastCheckDate = new Date(Date.now() - 30 * 60000)
    if (lastCheckSetting?.value) {
        lastCheckDate = new Date(lastCheckSetting.value)
    }
    console.log("lastCheckDate Object:", lastCheckDate.toISOString());

    const formatJumiaDate = (d: Date) => d.toISOString().replace('T', ' ').split('.')[0]
    console.log("createdAfter sent to Jumia:", formatJumiaDate(lastCheckDate));
}

run().catch(console.error).finally(() => prisma.$disconnect());
