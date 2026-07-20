import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

async function testWatermark() {
    const publicDir = path.join(process.cwd(), 'public');
    const baseImagePath = path.join(publicDir, 'uploads/books/82e831b07299e43a-2logo-houzez-white_2x.png');
    const logoPath = path.join(publicDir, 'logo.png');

    try {
        const baseImage = sharp(baseImagePath);
        const metadata = await baseImage.metadata();
        console.log('Metadata:', { width: metadata.width, height: metadata.height });

        const maxLogoSize = Math.max(20, Math.round(Math.min(metadata.width, metadata.height) * 0.25));
        console.log('Max logo size:', maxLogoSize);

        const logoBuffer = await sharp(logoPath)
            .resize({ width: maxLogoSize, height: maxLogoSize, fit: 'inside' })
            .toBuffer();
            
        console.log('Logo buffer size:', logoBuffer.length);

        const watermarkedFileName = `watermarked_test.png`;
        const uploadsMarketingDir = path.join(publicDir, 'uploads', 'marketing');
        
        await fs.mkdir(uploadsMarketingDir, { recursive: true });
        const outputPath = path.join(uploadsMarketingDir, watermarkedFileName);

        await baseImage
            .composite([
                {
                    input: logoBuffer,
                    gravity: 'southeast'
                }
            ])
            .toFile(outputPath);
            
        console.log('Success! Saved to:', outputPath);
    } catch (e) {
        console.error('Error during watermark:', e);
    }
}

testWatermark();
