// Builds public/og.png (1200x630) from the cover photo. Run after changing the
// photo or the name line: `node scripts/make-og.mjs`. The result is committed.
import sharp from 'sharp';

const W = 1200;
const H = 630;
const photo = await sharp('src/assets/photos/cover-porto.png').resize(H, H, { fit: 'cover' }).toBuffer();

const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="fade" x1="0" x2="1">
      <stop offset="0" stop-color="#0B0F14"/>
      <stop offset="1" stop-color="#0B0F14" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="${W - H}" width="220" height="${H}" fill="url(#fade)"/>
  <rect x="72" y="150" width="56" height="4" fill="#C9A227"/>
  <g font-family="Segoe UI, Arial, sans-serif" fill="#E8EDF2">
    <text x="72" y="250" font-size="64" font-weight="700">Faris Radifan</text>
    <text x="72" y="326" font-size="64" font-weight="700">Ahmad</text>
    <text x="72" y="396" font-size="28" fill="#93A1B0">Data Analyst · Business Intelligence</text>
    <text x="72" y="436" font-size="28" fill="#93A1B0">Automation</text>
    <text x="72" y="540" font-size="24" fill="#C9A227">farisradifana.my.id</text>
  </g>
</svg>`;

await sharp({ create: { width: W, height: H, channels: 3, background: '#0B0F14' } })
  .composite([
    { input: photo, left: W - H, top: 0 },
    { input: Buffer.from(text), left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile('public/og.png');
console.log('public/og.png written');
