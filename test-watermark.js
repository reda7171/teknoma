const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function testWatermark() {
    const publicDir = path.join(__dirname, 'public');
    const logoPath = path.join(publicDir, 'logo.png');
    // let's grab an image from public/uploads/books/ or similar
    // we need to find an image.
    const imagesDir = path.join(publicDir, 'images'); // assuming there are some images
    const files = fs.readdirSync(imagesDir);
    const baseImageFile = files.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
    if (!baseImageFile) {
        console.log('No base image found');
        return;
    }
    const baseImagePath = path.join(imagesDir, baseImageFile);
    
    console.log('Base image:', baseImagePath);
    const baseImage = sharp(baseImagePath);
    const metadata = await baseImage.metadata();
    console.log('Metadata:', metadata.width, metadata.height);

    const maxLogoSize = Math.max(30, Math.round(Math.min(metadata.width, metadata.height) * 0.25));
    console.log('Max logo size:', maxLogoSize);

    const logoBuffer = await sharp(logoPath)
        .resize({ width: maxLogoSize, height: maxLogoSize, fit: 'inside' })
        .toBuffer();
    
    const outputPath = path.join(__dirname, 'test_output.jpg');
    
    await baseImage
        .composite([
            {
                input: logoBuffer,
                gravity: 'southeast'
            }
        ])
        .toFile(outputPath);
    console.log('Done:', outputPath);
}

testWatermark().catch(console.error);
