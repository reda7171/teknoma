import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { bookId, whatsapp } = body;

        if (!bookId || !whatsapp) {
            return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
        }

        const reservation = await prisma.bookReservation.create({
            data: {
                bookId,
                whatsapp,
                status: 'PENDING',
            },
            include: {
                book: true
            }
        });

        // Clean phone number for WhatsApp
        let cleanPhone = whatsapp.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '212' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('212') && cleanPhone.length === 9) {
            cleanPhone = '212' + cleanPhone;
        }

        const whatsappText = encodeURIComponent(`Bonjour, suite à votre réservation du livre  "${reservation.book.title}" sur PetsUnivers...`);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${whatsappText}`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '💬 WhatsApp Confirm', url: whatsappUrl }
                ]
            ]
        };

        // Send Telegram notification
        const message = `📚 <b>Nouvelle Réservation</b>\n\nLivre: ${reservation.book.title}\nWhatsApp: ${whatsapp}\n\nVous pouvez le contacter directement ou gérer les réservations depuis l'admin.`;
        await sendTelegramMessage(message, undefined, undefined, replyMarkup).catch(console.error);

        return NextResponse.json({ success: true, reservation });
    } catch (error) {
        console.error('Reservation error:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
