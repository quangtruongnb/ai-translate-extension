const sharp = require('sharp');
const path = require('path');

const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6c5ce7"/>
      <stop offset="100%" style="stop-color:#a29bfe"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="20" fill="url(#bg)"/>
  <g transform="translate(64, 58)">
    <circle cx="0" cy="0" r="34" fill="none" stroke="white" stroke-width="4" opacity="0.9"/>
    <ellipse cx="0" cy="0" rx="17" ry="34" fill="none" stroke="white" stroke-width="3" opacity="0.7"/>
    <line x1="-34" y1="0" x2="34" y2="0" stroke="white" stroke-width="3" opacity="0.5"/>
    <line x1="-30" y1="-16" x2="30" y2="-16" stroke="white" stroke-width="2" opacity="0.4"/>
    <line x1="-30" y1="16" x2="30" y2="16" stroke="white" stroke-width="2" opacity="0.4"/>
  </g>
  <text x="78" y="108" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="white" opacity="0.9">文</text>
</svg>`;

const iconsDir = path.join(__dirname, '..', 'src', 'assets', 'icons');

async function generate() {
  for (const size of [16, 48, 128]) {
    const svg = Buffer.from(svgTemplate(size));
    await sharp(svg).resize(size, size).png().toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
}

generate().catch(console.error);
