const sharp = require('../frontend/node_modules/sharp');
const fs = require('fs');

// Test different vector Rupee geometries
function makeSvg(width, height, fn) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
    <rect width="${width}" height="${height}" fill="white"/>
    ${fn()}
  </svg>`;
}

// Option A: Proportional vector curve
function renderOptionA(x, y, size, strokeWidth, strokeColor) {
  const w = size * 0.70;
  const topY = y - size;
  const midY = topY + size * 0.45;
  const loopBotY = topY + size * 0.52;
  const stemX = x + w * 0.16;
  const rightX = x + w;
  const loopRight = stemX + (w - stemX + x) * 1.0;
  const cpX = stemX + (loopRight - stemX) * 1.5;

  return `
    <!-- Top bar -->
    <line x1="${x}" y1="${topY}" x2="${rightX}" y2="${topY}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <!-- Second bar -->
    <line x1="${x}" y1="${midY}" x2="${rightX * 0.9 + x * 0.1}" y2="${midY}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <!-- Vertical stem -->
    <line x1="${stemX}" y1="${topY}" x2="${stemX}" y2="${loopBotY}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <!-- Loop curve -->
    <path d="M ${stemX} ${topY} C ${cpX} ${topY}, ${cpX} ${loopBotY}, ${stemX} ${loopBotY}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none"/>
    <!-- Diagonal leg -->
    <line x1="${stemX}" y1="${loopBotY}" x2="${rightX * 0.95 + x * 0.05}" y2="${y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  `;
}

// Option B: Official Lucide geometry scaled
function renderOptionB(x, y, size, strokeWidth, strokeColor) {
  // Lucide: 24x24 viewBox, content from x=6..18, y=3..21 (dx=12, dy=18)
  const scale = size / 18;
  const sx = (val) => x + (val - 6) * scale;
  const sy = (val) => y - size + (val - 3) * scale;
  
  return `
    <path d="M ${sx(6)} ${sy(3)} h ${12 * scale}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <path d="M ${sx(6)} ${sy(8)} h ${12 * scale}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <path d="M ${sx(6)} ${sy(13)} h ${3 * scale}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <path d="M ${sx(9)} ${sy(13)} C ${sx(9 + 6.667)} ${sy(13)}, ${sx(9 + 6.667)} ${sy(3)}, ${sx(9)} ${sy(3)}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none"/>
    <path d="M ${sx(6)} ${sy(13)} L ${sx(14.5)} ${sy(21)}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  `;
}

const svg = makeSvg(500, 300, () => {
  return `
    <!-- Label Option A -->
    <text x="30" y="50" font-family="Arial" font-size="20" fill="#333">Option A (Standard Vector with Stem):</text>
    ${renderOptionA(30, 140, 60, 5, "#0f172a")}
    <text x="100" y="140" font-family="Arial" font-size="60" fill="#0f172a">199.00</text>
    ${renderOptionA(30, 240, 65, 7, "#c51b24")}
    <text x="105" y="240" font-family="Arial" font-weight="bold" font-size="65" fill="#c51b24">235.00</text>

    <!-- Label Option B -->
    <text x="280" y="50" font-family="Arial" font-size="20" fill="#333">Option B (Lucide Exact):</text>
    ${renderOptionB(280, 140, 60, 5, "#0f172a")}
    <text x="350" y="140" font-family="Arial" font-size="60" fill="#0f172a">199.00</text>
    ${renderOptionB(280, 240, 65, 7, "#c51b24")}
    <text x="355" y="240" font-family="Arial" font-weight="bold" font-size="65" fill="#c51b24">235.00</text>
  `;
});

sharp(Buffer.from(svg))
  .png()
  .toFile('scratch/preview_rupee.png')
  .then(() => console.log('Saved scratch/preview_rupee.png'))
  .catch(err => console.error(err));
