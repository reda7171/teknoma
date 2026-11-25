// Script génération image placeholder produits Tekno Store
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');

// SVG 800x800 — Placeholder High-Tech Tekno Store (aucun mauve/violet)
const svgPlaceholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="1.5" fill="#D5D9E0" />
    </pattern>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F8F9FA;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ECEFF3;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#75C300;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8FE000;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Fond neutre clair -->
  <rect width="800" height="800" fill="url(#cardBg)" />
  <rect width="800" height="800" fill="url(#grid)" opacity="0.7" />

  <!-- Cadre central discret -->
  <rect x="160" y="160" width="480" height="480" rx="56" fill="#FFFFFF" stroke="#E2E6EC" stroke-width="2" />

  <!-- Icône smartphone + laptop stylisée en filaire -->
  <g transform="translate(260, 235)" fill="none" stroke="#CBD2DC" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <!-- Laptop -->
    <rect x="20" y="20" width="210" height="140" rx="14" />
    <line x1="0" y1="172" x2="250" y2="172" />
    <!-- Smartphone superposé -->
    <rect x="185" y="65" width="76" height="130" rx="14" fill="#FFFFFF" stroke="#9AA4B2" stroke-width="6" />
    <line x1="213" y1="80" x2="233" y2="80" stroke="#CBD2DC" stroke-width="4" />
  </g>

  <!-- Badge Monogramme Tekno Store -->
  <g transform="translate(352, 465)">
    <rect width="96" height="96" rx="24" fill="#111315" />
    <rect x="18" y="22" width="60" height="14" rx="4" fill="url(#accentGreen)" />
    <rect x="41" y="22" width="14" height="54" rx="4" fill="#FFFFFF" />
    <rect x="70" y="70" width="6" height="6" rx="2" fill="#75C300" opacity="0.7" />
  </g>

  <!-- Texte marque -->
  <text x="400" y="596" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" letter-spacing="4" fill="#1A1C1F">TEKNO STORE</text>
  <text x="400" y="622" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" letter-spacing="2" fill="#8A94A6">HIGH-TECH MAROC</text>
</svg>`;

async function run() {
  const svgBuffer = Buffer.from(svgPlaceholder);

  // Assurer l'existence des dossiers cibles
  fs.mkdirSync(path.join(PUBLIC, 'uploads', 'books'), { recursive: true });
  fs.mkdirSync(path.join(PUBLIC, 'images'), { recursive: true });

  const pngTargets = [
    path.join(PUBLIC, 'book-placeholder.png'),
    path.join(PUBLIC, 'placeholder.png'),
    path.join(PUBLIC, 'placeholder-book.png'),
  ];

  const jpgTargets = [
    path.join(PUBLIC, 'uploads', 'books', 'placeholder.jpg'),
    path.join(PUBLIC, 'placeholder.jpg'),
    path.join(PUBLIC, 'images', 'placeholder.jpg'),
    path.join(PUBLIC, 'images', 'placeholder-pack.jpg'),
  ];

  for (const target of pngTargets) {
    await sharp(svgBuffer).resize(800, 800).png({ quality: 90, compressionLevel: 9 }).toFile(target);
    console.log('PNG généré:', path.relative(PUBLIC, target));
  }

  for (const target of jpgTargets) {
    await sharp(svgBuffer).resize(800, 800).jpeg({ quality: 88, mozjpeg: true }).toFile(target);
    console.log('JPG généré:', path.relative(PUBLIC, target));
  }
}

run().then(() => console.log('Placeholders Tekno Store générés avec succès !')).catch((e) => {
  console.error(e);
  process.exit(1);
});
