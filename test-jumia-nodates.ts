import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    const settings = await prisma.siteSettings.findMany({
        where: { key: { in: ['jumia_email', 'jumia_api_key', 'jumia_environment', 'jumia_enabled'] } }
    });
    
    const config = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const baseUrl = config.jumia_environment === 'live' ? 'https://vendor-api.jumia.com' : 'https://vendor-api-staging.jumia.com';
        
    const authRes = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.jumia_email,
            refresh_token: config.jumia_api_key,
            grant_type: 'refresh_token'
        })
    });
    const token = (await authRes.json()).access_token;
    
    const url = `${baseUrl}/orders?size=100`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const body = await res.json();
    const orders = body.orders || body.data?.orders || [];
    console.log(`Found ${orders.length} orders.`);
    if (orders.length > 0) {
        console.log(`First order date: ${orders[0].createdAt}`);
        console.log(`Last order date: ${orders[orders.length-1].createdAt}`);
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
