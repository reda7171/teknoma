import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url || !url.includes('instagram.com')) {
            return NextResponse.json({ error: 'Lien Instagram invalide.' }, { status: 400 });
        }

        const apiKey = process.env.RAPIDAPI_KEY || '90ec8c359emsh82a0c93ad55f39ap1decc7jsnff33d20b4644';
        const host = 'instagram-scraper-stable-api.p.rapidapi.com';

        // Convert Instagram shortcode to numeric ID
        const getIdFromShortcode = (shortcode: string) => {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
            let id = 0n;
            for (let i = 0; i < shortcode.length; i++) {
                id = (id * 64n) + BigInt(alphabet.indexOf(shortcode[i]));
            }
            return id.toString();
        };

        const shortcodeMatch = url.match(/\/p\/([a-zA-Z0-9_-]+)/);
        const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

        if (!shortcode) {
             return NextResponse.json({ error: 'Impossible d\'extraire le code du post Instagram depuis l\'URL.' }, { status: 400 });
        }

        const postId = getIdFromShortcode(shortcode);

        // Appel vers l'API Instagram Scraper Stable API fournie
        // L'API attend 'post_id' obligatoirement comme un nombre
        const apiUrl = `https://${host}/get_post_comments.php?post_id=${postId}&sort_order=popular`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': host,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: `Erreur API: ${response.status}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();

        // Gérer les erreurs renvoyées dans le JSON avec un statut 200
        if (data.error || data.message) {
            return NextResponse.json({ error: data.error || data.message }, { status: 400 });
        }
        
        // Structure de réponse typique des API de scraping Instagram
        // Adapter selon la structure réelle retournée par get_post_comments.php
        const items = data?.data?.items || data?.items || data?.comments || data?.data || [];
        
        // Extraire les noms d'utilisateurs uniques
        const usernames = items
            .map((item: any) => item.user?.username || item.owner?.username || item.username)
            .filter(Boolean);

        const uniqueUsernames = Array.from(new Set(usernames));

        return NextResponse.json({
            success: true,
            count: uniqueUsernames.length,
            usernames: uniqueUsernames
        });

    } catch (error: any) {
        console.error('API Instagram Comments Error:', error);
        return NextResponse.json({ error: 'Erreur interne du serveur.', details: error.message }, { status: 500 });
    }
}
