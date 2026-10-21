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
            recipients = [
                { email: admin.email, fullName: 'Admin' }
            ];
        } else if (audience === 'NEWSLETTER_SUBSCRIBERS') {
            const subscribers = await prisma.newsletterSubscriber.findMany({
                select: { email: true }
            });
            recipients = subscribers.map(sub => ({ email: sub.email, fullName: 'Abonné(e)' }));
        } else if (audience === 'TARGETED_CLIENTS') {
            const { targetedEmails } = body;
            if (!targetedEmails || targetedEmails.trim() === '') {
                return NextResponse.json({ error: 'Aucun email fourni pour les clients ciblés' }, { status: 400 });
            }
            const emails = targetedEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e !== '');
            recipients = emails.map((email: string) => ({ email, fullName: 'Client' }));
        } else {
            return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
        }

        if (recipients.length === 0) {
            return NextResponse.json({ error: 'No recipients found' }, { status: 404 });
        }

        // Sending via Hostinger Mail API
        let successCount = 0;
        let failCount = 0;

        // In a real bulk scenario, Hostinger might support bulk sending or we send individually.
        // The hostinger-mail-api-sdk typically allows sending a single email or batch.
        // For simplicity and safety within limits, we'll map them to SendMessage objects
        // The exact structure depends on the SDK, but typical usage:
        
        // Since we are iterating, we send emails one by one. (In a true background job, this should not block)
        // Note: For thousands of emails, this should be offloaded to a queue (like BullMQ or Trigger.dev),
        // or we should use chunking. We'll chunk to avoid taking too long.

        const MAX_PER_BATCH = 100; // Limit for a single sync request to not timeout
        const limitedRecipients = recipients.slice(0, MAX_PER_BATCH);

        for (const recipient of limitedRecipients) {
            try {
                const personalizedHtml = html
                    .replace(/{{name}}/gi, recipient.fullName || 'Cher lecteur')
                    .replace(/{{client_nom}}/gi, recipient.fullName || 'Cher lecteur');
                
                const personalizedSubject = subject
                    .replace(/{{name}}/gi, recipient.fullName || 'Cher lecteur')
                    .replace(/{{client_nom}}/gi, recipient.fullName || 'Cher lecteur');

                await transporter.sendMail({
                    from: '"Riwaya" <contact@riwaya.store>',
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
