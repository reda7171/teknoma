import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/actions/auth';
import { getSetting } from '@/lib/actions/site-settings';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin();
    } catch {
        return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { action = 'check_status', tokenOverride, boardIdOverride } = body;

        const accessToken = tokenOverride || (await getSetting('pinterest_access_token'));
        const boardId = boardIdOverride || (await getSetting('pinterest_board_id'));

        if (!accessToken) {
            return NextResponse.json({
                success: false,
                error: 'Jeton d\'accès Pinterest (Access Token) manquant.'
            }, { status: 400 });
        }

        // 1. Diagnostic Utilisateur / Compte
        let userAccount: any = null;
        try {
            const userRes = await axios.get('https://api.pinterest.com/v5/user_account', {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                timeout: 8000
            });
            userAccount = userRes.data;
        } catch (err: any) {
            console.error('Erreur Pinterest User Account:', err.response?.data || err.message);
            const errMsg = err.response?.data?.message || err.message;
            return NextResponse.json({
                success: false,
                error: `Jeton invalide ou expiré : ${errMsg}`,
                details: err.response?.data
            }, { status: 400 });
        }

        // 2. Diagnostic Tableau (Board)
        let boardData: any = null;
        if (boardId) {
            try {
                const boardRes = await axios.get(`https://api.pinterest.com/v5/boards/${boardId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: 8000
                });
                boardData = boardRes.data;
            } catch (err: any) {
                console.error('Erreur Pinterest Board:', err.response?.data || err.message);
                const errMsg = err.response?.data?.message || err.message;
                return NextResponse.json({
                    success: false,
                    error: `Impossible de récupérer le tableau (${boardId}) : ${errMsg}`,
                    userAccount,
                    details: err.response?.data
                }, { status: 400 });
            }
        }

        const isPublicBoard = boardData?.privacy?.toUpperCase() === 'PUBLIC';

        // 3. Test de publication si demandé
        let publishedPin: any = null;
        if (action === 'test_publish') {
            if (!boardId) {
                return NextResponse.json({
                    success: false,
                    error: 'Board ID requis pour publier une épingle de test.'
                }, { status: 400 });
            }

            // Récupérer un livre réel spécifique ou varier avec un livre aléatoire
            let sampleBook = null;
            if (body.bookId) {
                sampleBook = await prisma.book.findUnique({
                    where: { id: body.bookId },
                    select: { id: true, title: true, description: true, image: true, price: true }
                });
            }
            if (!sampleBook) {
                const count = await prisma.book.count({ where: { image: { not: '' } } });
                const skip = count > 1 ? Math.floor(Math.random() * Math.min(count, 20)) : 0;
                sampleBook = await prisma.book.findFirst({
                    where: { image: { not: '' } },
                    skip,
                    select: { id: true, title: true, description: true, image: true, price: true }
                });
            }

            const imgUrl = sampleBook?.image?.startsWith('http')
                ? sampleBook.image
                : sampleBook?.image
                    ? `https://riwaya.store${sampleBook.image}`
                    : 'https://riwaya.store/logo.png';

            const pinPayload = {
                board_id: boardId,
                title: sampleBook ? `[Test Riwaya] ${sampleBook.title.substring(0, 75)}` : '[Test Riwaya] Boutique Littéraire',
                description: sampleBook?.description?.substring(0, 450) || 'Découvrez nos collections de livres et packs littéraires au Maroc sur Riwaya.store.',
                link: sampleBook ? `https://riwaya.store/fr/books/${sampleBook.id}` : 'https://riwaya.store',
                media_source: {
                    source_type: 'image_url',
                    url: imgUrl
                }
            };

            const pinRes = await axios.post('https://api.pinterest.com/v5/pins', pinPayload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            publishedPin = pinRes.data;
        }

        return NextResponse.json({
            success: true,
            userAccount: {
                username: userAccount?.username,
                accountType: userAccount?.account_type,
                businessName: userAccount?.business_name,
                websiteUrl: userAccount?.website_url,
                profileImage: userAccount?.profile_image
            },
            board: boardData ? {
                id: boardData.id,
                name: boardData.name,
                privacy: boardData.privacy,
                isPublic: isPublicBoard,
                pinCount: boardData.pin_count,
                owner: boardData.owner?.username
            } : null,
            publishedPin: publishedPin ? {
                id: publishedPin.id,
                title: publishedPin.title,
                link: publishedPin.link,
                pinUrl: `https://www.pinterest.com/pin/${publishedPin.id}/`,
                createdAt: publishedPin.created_at
            } : null,
            diagnostics: {
                isTokenValid: true,
                isBoardPublic: isPublicBoard,
                websiteConfigured: Boolean(userAccount?.website_url),
                warning: !isPublicBoard && boardData ? 'Le tableau n\'est pas PUBLIC (visibilité restreinte ou secrète).' : null
            }
        });

    } catch (error: any) {
        console.error('Erreur API Pinterest Test:', error.response?.data || error.message);
        return NextResponse.json({
            success: false,
            error: error.response?.data?.message || error.message || 'Erreur lors du test Pinterest',
            details: error.response?.data
        }, { status: 500 });
    }
}
