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
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    console.log(`Testing monthStart=${monthStart}, monthEnd=${monthEnd}`);
    
    const url = `${baseUrl}/orders?size=100&createdAfter=${monthStart}&createdBefore=${monthEnd}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    console.log(`Page 1 status: ${res.status}`);
    
    const nextToken = data.nextPageToken || data.data?.nextPageToken;
    if (nextToken) {
        console.log("Next token is:", nextToken);
        const url2 = `${baseUrl}/orders?size=100&createdAfter=${monthStart}&createdBefore=${monthEnd}&token=${nextToken}`;
        const res2 = await fetch(url2, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log(`Page 2 status without encoding: ${res2.status}`);
        if (res2.status !== 200) console.log(await res2.text());
        
        const url3 = `${baseUrl}/orders?size=100&createdAfter=${monthStart}&createdBefore=${monthEnd}&token=${encodeURIComponent(nextToken)}`;
        const res3 = await fetch(url3, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log(`Page 2 status WITH encoding: ${res3.status}`);
    } else {
        console.log("No next token found, maybe not enough orders in this month.");
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
