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

        // Send Telegram notification
        const message = `📚 *Nouvelle réservation de livre*\n\nLivre: ${reservation.book.title}\nWhatsApp: ${whatsapp}\n\nVous pouvez le contacter directement ou gérer les réservations depuis l'admin.`;
        await sendTelegramMessage(message).catch(console.error);

        return NextResponse.json({ success: true, reservation });
    } catch (error) {
        console.error('Reservation error:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
