import { PrismaClient } from '@prisma/client';

async function test() {
    const res = await fetch('http://localhost:3000/api/webhooks/telegram', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            callback_query: {
                id: 'test_callback_id',
                data: 'jumia:monthly_stats',
                message: {
                    chat: { id: 123456 },
                    message_id: 111
                }
            }
        })
    });
    console.log("Status:", res.status);
    console.log(await res.text());
}

test().catch(console.error);
