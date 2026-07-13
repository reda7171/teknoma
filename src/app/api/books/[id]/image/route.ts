import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const book = await prisma.book.findUnique({
            where: { id: params.id },
            select: { image: true }
        })

        if (!book || !book.image) {
            return new NextResponse('Image not found', { status: 404 })
        }

        const image = book.image;

        if (image.startsWith('http')) {
            return NextResponse.redirect(image)
        }

        if (image.startsWith('/')) {
            return NextResponse.redirect(new URL(image, request.url))
        }

        let base64Data = image;
        let contentType = 'image/jpeg';

        if (image.startsWith('data:')) {
            const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                contentType = matches[1];
                base64Data = matches[2];
            }
        } else {
            if (image.startsWith('/9j/')) contentType = 'image/jpeg';
            else if (image.startsWith('iVBOR')) contentType = 'image/png';
            else if (image.startsWith('R0lGOD')) contentType = 'image/gif';
            else if (image.startsWith('UklGR')) contentType = 'image/webp';
        }

        const buffer = Buffer.from(base64Data, 'base64');
        
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        })
    } catch (error) {
        console.error('Error serving book image:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
