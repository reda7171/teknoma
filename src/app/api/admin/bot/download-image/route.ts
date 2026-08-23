import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('URL manquante', { status: 400 });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Image not found');

        const arrayBuffer = await response.arrayBuffer();
        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
        // Force le téléchargement avec un nom de fichier générique
        headers.set('Content-Disposition', 'attachment; filename="image_livre.png"');

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers,
        });
    } catch (error) {
        return new NextResponse('Erreur lors de la récupération de l\'image depuis la production', { status: 500 });
    }
}
