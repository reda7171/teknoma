import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/actions/auth';
import { publishPin } from '@/lib/pinterest';
import { getSetting } from '@/lib/actions/site-settings';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { bookId, customImageUrl, customCaption, link } = await req.json();

        const accessToken = await getSetting('pinterest_access_token');
        const boardId = await getSetting('pinterest_board_id');

        if (!accessToken || !boardId) {
            return NextResponse.json({ error: 'Identifiants Pinterest manquants dans les paramètres.' }, { status: 400 });
        }

        let item = null;
        if (bookId) {
            item = await prisma.book.findUnique({ where: { id: bookId } });
        }

        const imageUrl = customImageUrl || item?.image;
        const title = item?.title || 'PetsUnivers';
        const description = customCaption || item?.description || '';
        const itemUrl = link || (item ? `https://petsunivers.ma/fr/books/${item.id}` : 'https://petsunivers.ma');

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image requise pour Pinterest' }, { status: 400 });
        }

        const result = await publishPin(
            imageUrl.startsWith('http') ? imageUrl : `https://petsunivers.ma${imageUrl}`,
            title,
            description,
            itemUrl,
            boardId,
            accessToken
        );

        const pinId = result?.id;
        const pinUrl = pinId ? `https://www.pinterest.com/pin/${pinId}/` : undefined;

        // Enregistrer la publication dans l'historique ScheduledPost
        try {
            await prisma.scheduledPost.create({
                data: {
                    date: new Date(),
                    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    content: `[Pinterest] ${title} - ${description.substring(0, 150)}`,
                    platforms: JSON.stringify(['pinterest']),
                    mediaUrl: pinUrl || imageUrl,
                    status: 'PUBLISHED'
                }
            });
        } catch (dbErr) {
            console.error('Erreur enregistrement ScheduledPost Pinterest:', dbErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Épingle Pinterest publiée avec succès !',
            pinId,
            pinUrl,
            result
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
