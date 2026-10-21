import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth';

function isAllowedImageUrl(value: string) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return false;

        const allowedHosts = new Set(['riwaya.store', 'www.riwaya.store']);
        if (process.env.NEXTAUTH_URL) allowedHosts.add(new URL(process.env.NEXTAUTH_URL).hostname);

        return allowedHosts.has(url.hostname);
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    const admin = await getAuthenticatedAdmin();
    if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url || !isAllowedImageUrl(url)) {
        return new NextResponse('URL non autoris\u00e9e', { status: 400 });
    }

    try {
        const response = await fetch(url, { redirect: 'error' });
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
    } catch {
        return new NextResponse('Erreur lors de la récupération de l\'image depuis la production', { status: 500 });
    }
}
