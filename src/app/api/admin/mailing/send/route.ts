import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { transporter } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const admin = await getAuthenticatedAdmin();
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
        if (!hasAdminRole(admin, ['ADMIN', 'MANAGER'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 });

        const body = await req.json();
        const { subject, html, audience } = body;

        if (!subject || !html || !audience) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch recipients based on audience
        let recipients: { email: string; fullName?: string }[] = [];

        if (audience === 'ALL_CUSTOMERS') {
            const customers = await prisma.customer.findMany({
                where: { email: { not: null, notIn: [''] } },
                select: { email: true, fullName: true }
            });
            recipients = customers as { email: string; fullName: string }[];
        } else if (audience === 'TEST_ONLY') {
            const adminUser = await prisma.user.findFirst({
                where: { email: admin.email },
                select: { name: true }
            });
            recipients = [
                { email: admin.email, fullName: adminUser?.name || 'Admin' }
            ];
        } else if (audience === 'NEWSLETTER_SUBSCRIBERS') {
            const subscribers = await prisma.newsletterSubscriber.findMany({
                select: { email: true }
            });
            const subEmails = subscribers.map(s => s.email).filter(Boolean);
            const customers = await prisma.customer.findMany({
                where: { email: { in: subEmails } },
                select: { email: true, fullName: true }
            });
            const nameMap = new Map<string, string>();
            customers.forEach(c => { if (c.email && c.fullName) nameMap.set(c.email.toLowerCase(), c.fullName); });
            recipients = subscribers.map(sub => ({
                email: sub.email,
                fullName: nameMap.get(sub.email.toLowerCase()) || sub.email.split('@')[0] || 'Cher lecteur'
            }));
        } else if (audience === 'TARGETED_CLIENTS') {
            const { targetedEmails } = body;
            if (!targetedEmails || targetedEmails.trim() === '') {
                return NextResponse.json({ error: 'Aucun email fourni pour les clients ciblés' }, { status: 400 });
            }
            const emails = targetedEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e !== '');
            const [customers, orders] = await Promise.all([
                prisma.customer.findMany({
                    where: { email: { in: emails } },
                    select: { email: true, fullName: true }
                }),
                prisma.order.findMany({
                    where: { email: { in: emails } },
                    select: { email: true, fullName: true },
                    orderBy: { createdAt: 'desc' }
                })
            ]);
            const nameMap = new Map<string, string>();
            customers.forEach(c => { if (c.email && c.fullName) nameMap.set(c.email.toLowerCase(), c.fullName); });
            orders.forEach(o => { if (o.email && o.fullName && !nameMap.has(o.email.toLowerCase())) nameMap.set(o.email.toLowerCase(), o.fullName); });
            recipients = emails.map((email: string) => ({
                email,
                fullName: nameMap.get(email.toLowerCase()) || email.split('@')[0] || 'Cher lecteur'
            }));
        } else {
            return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
        }

        if (recipients.length === 0) {
            return NextResponse.json({ error: 'No recipients found' }, { status: 404 });
        }

        // Récupérer le code coupon à appliquer (depuis le formulaire ou le premier coupon actif en base)
        let couponCode = (body.couponCode || '').trim();
        if (!couponCode) {
            const activeCoupon = await prisma.coupon.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                select: { code: true }
            });
            couponCode = activeCoupon?.code || 'PETSUNIVERS10';
        }

        // Sending via Hostinger Mail API
        let successCount = 0;
        let failCount = 0;

        const MAX_PER_BATCH = 100; // Limit for a single sync request to not timeout
        const limitedRecipients = recipients.slice(0, MAX_PER_BATCH);

        for (const recipient of limitedRecipients) {
            try {
                const clientNom = recipient.fullName && recipient.fullName !== 'Client'
                    ? recipient.fullName
                    : (recipient.email.split('@')[0] || 'Cher lecteur');

                const replaceTags = (text: string) => {
                    return text
                        .replace(/{{\s*(?:client_nom|customer_name|nom|name|client)\s*}}/gi, clientNom)
                        .replace(/{{\s*(?:coupon_code|coupon|code_coupon|code_promo|promo_code)\s*}}/gi, couponCode)
                        .replace(/(&#123;|&lbrace;|\{)\s*(\{|&#123;|&lbrace;)\s*(client_nom|customer_name|nom|name|client)\s*(\}|&#125;|&rbrace;)\s*(\}|&#125;|&rbrace;)/gi, clientNom)
                        .replace(/(&#123;|&lbrace;|\{)\s*(\{|&#123;|&lbrace;)\s*(coupon_code|coupon|code_coupon|code_promo|promo_code)\s*(\}|&#125;|&rbrace;)\s*(\}|&#125;|&rbrace;)/gi, couponCode);
                };

                const personalizedHtml = replaceTags(html);
                const personalizedSubject = replaceTags(subject);

                await transporter.sendMail({
                    from: '"PetsUnivers" <contact@petsunivers.ma>',
                    to: recipient.email,
                    subject: personalizedSubject,
                    html: personalizedHtml,
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to send email to ${recipient.email}:`, error);
                failCount++;
            }
        }

        let message = `Envoyé à ${successCount} personnes (${failCount} erreurs).`;
        if (recipients.length > MAX_PER_BATCH) {
            message += ` Note: limité à ${MAX_PER_BATCH} destinataires en temps réel.`;
        }

        return NextResponse.json({
            success: true,
            message,
            stats: { total: recipients.length, success: successCount, failed: failCount }
        });

    } catch (error: any) {
        console.error('Mailing Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
