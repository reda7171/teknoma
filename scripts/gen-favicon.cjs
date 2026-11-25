// Script génération favicon Tekno Store
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const APP = path.join(__dirname, '..', 'src', 'app');

// SVG 512x512 — monogramme "T" Tekno Store
// Fond noir, lettre T verte (#75C300), style tech moderne
const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#111111;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0A0A0A;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="green" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#8FE000;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5FA000;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Fond carré arrondi -->
  <rect width="512" height="512" rx="96" ry="96" fill="url(#bg)"/>

  <!-- Accent vert — barre horizontale du T -->
  <rect x="72" y="108" width="368" height="80" rx="20" fill="url(#green)"/>

  <!-- Fût vertical du T -->
  <rect x="216" y="108" width="80" height="296" rx="20" fill="#FFFFFF"/>

  <!-- Pixel accent décoratif coin bas-droit -->
  <rect x="384" y="376" width="24" height="24" rx="6" fill="#75C300" opacity="0.5"/>
  <rect x="416" y="376" width="12" height="12" rx="4" fill="#75C300" opacity="0.3"/>
</svg>`;

// SVG simplifié pour icon.svg (App Router)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" ry="96" fill="#0A0A0A"/>
  <rect x="72" y="108" width="368" height="80" rx="20" fill="#75C300"/>
  <rect x="216" y="108" width="80" height="296" rx="20" fill="#FFFFFF"/>
  <rect x="384" y="376" width="24" height="24" rx="6" fill="#75C300" opacity="0.5"/>
</svg>`;

const svgBuffer = Buffer.from(svg512);

async function run() {
  // favicon-32x32.png
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(PUBLIC, 'favicon-32x32.png'));
  console.log('favicon-32x32.png OK');

  // favicon-16x16.png
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(PUBLIC, 'favicon-16x16.png'));
  console.log('favicon-16x16.png OK');

  // favicon-48x48.png pour .ico
  const buf48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  // favicon.ico — on utilise le 32px (sharp ne génère pas multi-ICO nativement)
  // On écrit un ICO contenant 1 image 32x32
  const buf32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const ico = buildIco([buf32]);
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico);
  console.log('favicon.ico OK');

  // apple-touch-icon 180x180
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
  console.log('apple-touch-icon.png OK');

  // favicon.svg dans public
  fs.writeFileSync(path.join(PUBLIC, 'favicon.svg'), svg512);
  console.log('favicon.svg OK');

  // icon.svg dans src/app (App Router Next.js)
  fs.writeFileSync(path.join(APP, 'icon.svg'), svgIcon);
  console.log('src/app/icon.svg OK');

  // 192x192 pour manifest PWA si besoin
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(PUBLIC, 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(PUBLIC, 'icon-512.png'));
  console.log('PWA icons OK');
}

// Construction ICO minimal (1 image PNG)
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = count * dirEntrySize;
  const dataOffset = headerSize + dirSize;

  let imageOffset = dataOffset;
  const entries = [];
  for (const buf of pngBuffers) {
    // Lire width/height depuis PNG header
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    entries.push({ w, h, buf, offset: imageOffset });
    imageOffset += buf.length;
  }

  const totalSize = imageOffset;
  const ico = Buffer.alloc(totalSize);
  let pos = 0;

  // ICONDIR header
  ico.writeUInt16LE(0, pos); pos += 2;    // reserved
  ico.writeUInt16LE(1, pos); pos += 2;    // type=ICO
  ico.writeUInt16LE(count, pos); pos += 2; // count

  // ICONDIRENTRY
  for (const e of entries) {
    ico.writeUInt8(e.w >= 256 ? 0 : e.w, pos); pos++;
    ico.writeUInt8(e.h >= 256 ? 0 : e.h, pos); pos++;
    ico.writeUInt8(0, pos); pos++;   // color count
    ico.writeUInt8(0, pos); pos++;   // reserved
    ico.writeUInt16LE(1, pos); pos += 2; // planes
    ico.writeUInt16LE(32, pos); pos += 2; // bit count
    ico.writeUInt32LE(e.buf.length, pos); pos += 4;
    ico.writeUInt32LE(e.offset, pos); pos += 4;
  }

  // Image data
  for (const e of entries) {
    e.buf.copy(ico, e.offset);
  }

  return ico;
}

run().then(() => console.log('\nFavicon Tekno Store generé avec succès!')).catch(console.error);
