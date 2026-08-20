import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    
    try {
        const book = await prisma.book.findUnique({
            where: { id: params.id },
            select: { image: true }
        });

        if (!book || !book.image) {
            return new NextResponse('Not found', { status: 404 });
        }

        let imageBuffer: Buffer;

        // If the image is a URL
        if (book.image.startsWith('http')) {
            const response = await fetch(book.image);
            if (!response.ok) throw new Error('Failed to fetch remote image');
            imageBuffer = Buffer.from(await response.arrayBuffer());
        } 
        // If it's a local file in public/
        else {
            // Remove leading slash if present
            const cleanPath = book.image.startsWith('/') ? book.image.slice(1) : book.image;
            const imagePath = path.join(process.cwd(), 'public', cleanPath);
            if (!fs.existsSync(imagePath)) {
                return new NextResponse('Local image not found', { status: 404 });
            }
            imageBuffer = fs.readFileSync(imagePath);
        }

        // Resize and pad to 500x500 with white background (Merchant Center requirement)
        const processedImage = await sharp(imageBuffer)
            .resize(500, 500, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 90 })
            .toBuffer();

        return new NextResponse(processedImage, {
            headers: {
                'Content-Type': 'image/jpeg',
                // Cache for 1 year since book images rarely change, and we need high performance for feed crawlers
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error generating merchant image:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
