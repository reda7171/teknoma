const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  // Trim and resize logo
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  const logoBuffer = await sharp(logoPath)
    .trim()
    .resize(360, 270, { fit: 'inside' })
    .png()
    .toBuffer();

  const logoBase64 = 'data:image/png;base64,' + logoBuffer.toString('base64');

  // SVG overlay with modern Tekno Store high-tech branding
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glowBlue" cx="20%" cy="30%" r="45%">
          <stop offset="0%" stop-color="#1976D2" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#0B0F19" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glowGreen" cx="80%" cy="70%" r="50%">
          <stop offset="0%" stop-color="#75C300" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#0B0F19" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#161F30" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95"/>
        </linearGradient>
      </defs>

      <!-- Base dark background -->
      <rect width="${width}" height="${height}" fill="#080C14"/>

      <!-- Ambient glow orbs -->
      <circle cx="240" cy="200" r="380" fill="url(#glowBlue)"/>
      <circle cx="960" cy="440" r="420" fill="url(#glowGreen)"/>

      <!-- Tech grid lines -->
      <g stroke="#ffffff" stroke-opacity="0.04" stroke-width="1">
        <line x1="120" y1="0" x2="120" y2="630"/>
        <line x1="300" y1="0" x2="300" y2="630"/>
        <line x1="480" y1="0" x2="480" y2="630"/>
        <line x1="660" y1="0" x2="660" y2="630"/>
        <line x1="840" y1="0" x2="840" y2="630"/>
        <line x1="1020" y1="0" x2="1020" y2="630"/>
        <line x1="0" y1="105" x2="1200" y2="105"/>
        <line x1="0" y1="210" x2="1200" y2="210"/>
        <line x1="0" y1="315" x2="1200" y2="315"/>
        <line x1="0" y1="420" x2="1200" y2="420"/>
        <line x1="0" y1="525" x2="1200" y2="525"/>
      </g>

      <!-- Center-Left Card for Logo -->
      <rect x="70" y="95" width="400" height="440" rx="28" fill="url(#cardBg)" stroke="#1E293B" stroke-width="2"/>
      <image href="${logoBase64}" x="90" y="180" width="360" height="270" preserveAspectRatio="xMidYMid meet"/>

      <!-- Right Column: Content -->
      <!-- Category Tag -->
      <g transform="translate(520, 115)">
        <rect width="360" height="36" rx="18" fill="#1976D2" fill-opacity="0.15" stroke="#1976D2" stroke-opacity="0.4" stroke-width="1.5"/>
        <text x="180" y="23" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#60A5FA" text-anchor="middle" letter-spacing="1.5">
          SMARTPHONES · PC · MAC · AUDIO
        </text>
      </g>

      <!-- Main Headline -->
      <text x="520" y="215" font-family="Arial, sans-serif" font-size="46" font-weight="900" fill="#FFFFFF" letter-spacing="-1">
        Tekno Store Maroc
      </text>

      <!-- Subtitle -->
      <text x="520" y="265" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="#94A3B8">
        Smartphones, Ordinateurs, Mac &amp; Accessoires au Maroc
      </text>

      <!-- Reassurance Badges -->
      <g transform="translate(520, 315)">
        <!-- Badge 1: 100% Neuf & Garantie -->
        <rect x="0" y="0" width="280" height="52" rx="14" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>
        <circle cx="26" cy="26" r="12" fill="#1976D2" fill-opacity="0.2"/>
        <text x="26" y="31" font-family="Arial, sans-serif" font-size="14" fill="#60A5FA" text-anchor="middle">✓</text>
        <text x="48" y="25" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#F8FAFC">100% Neuf &amp; Scellé</text>
        <text x="48" y="41" font-family="Arial, sans-serif" font-size="11" fill="#64748B">Garantie constructeur 12M</text>

        <!-- Badge 2: COD Partout au Maroc -->
        <rect x="300" y="0" width="310" height="52" rx="14" fill="#0F172A" stroke="#75C300" stroke-opacity="0.4" stroke-width="1.5"/>
        <circle cx="326" cy="26" r="12" fill="#75C300" fill-opacity="0.2"/>
        <text x="326" y="31" font-family="Arial, sans-serif" font-size="14" fill="#75C300" text-anchor="middle">⚡</text>
        <text x="348" y="25" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#F8FAFC">Paiement à la livraison (COD)</text>
        <text x="348" y="41" font-family="Arial, sans-serif" font-size="11" fill="#75C300">Livraison express 24/48h Maroc</text>
      </g>

      <!-- Bottom Bar: URL & CTA -->
      <g transform="translate(520, 420)">
        <rect x="0" y="0" width="610" height="68" rx="18" fill="#75C300"/>
        <text x="30" y="42" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#0F172A" letter-spacing="0.5">
          Visitez tekno.ma
        </text>
        <text x="570" y="42" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#0F172A" text-anchor="end">
          →
        </text>
      </g>

      <!-- Bottom Copyright note -->
      <text x="520" y="525" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#475569" letter-spacing="0.5">
        Casablanca · Rabat · Marrakech · Tanger · Fès · Agadir &amp; tout le Maroc
      </text>
    </svg>
  `);

  const ogJpgPath = path.join(process.cwd(), 'public', 'og-image.jpg');
  const ogPngPath = path.join(process.cwd(), 'public', 'og-image.png');
  const ogPacksPath = path.join(process.cwd(), 'public', 'images', 'og-packs.png');
  const ogBlogPath = path.join(process.cwd(), 'public', 'images', 'og-blog.png');

  await sharp(svgOverlay)
    .jpeg({ quality: 92 })
    .toFile(ogJpgPath);

  await sharp(svgOverlay)
    .png({ quality: 92 })
    .toFile(ogPngPath);

  await sharp(svgOverlay)
    .png({ quality: 92 })
    .toFile(ogPacksPath);

  await sharp(svgOverlay)
    .png({ quality: 92 })
    .toFile(ogBlogPath);

  console.log('Tekno Store OG images generated successfully!');
}

generateOgImage().catch(console.error);
