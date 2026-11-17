const sharp = require('../frontend/node_modules/sharp');

async function run() {
  const { data, info } = await sharp('./frontend/public/hero-bg.png').raw().toBuffer({ resolveWithObject: true });
  // Let's check non-white / non-transparent pixels across columns x = 0 to 1024
  const colNonWhite = new Array(info.width).fill(0);
  for (let x = 0; x < info.width; x++) {
    for (let y = 0; y < info.height; y++) {
      const idx = (y * info.width + x) * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
      // Check if pixel is not pure white (#ffffff) and not transparent
      if (a > 20 && (r < 245 || g < 245 || b < 245)) {
        colNonWhite[x]++;
      }
    }
  }

  // Find where content starts
  let firstContentX = -1;
  for (let x = 0; x < info.width; x++) {
    if (colNonWhite[x] > 10) {
      firstContentX = x;
      break;
    }
  }
  console.log('In hero-bg.png (width 1024):');
  console.log('First non-white column:', firstContentX, `(${Math.round(firstContentX / info.width * 100)}%)`);
  console.log('Content density every 10% of width:');
  for (let p = 0; p < 10; p++) {
    const startX = Math.round(p * info.width / 10);
    const endX = Math.round((p + 1) * info.width / 10);
    const sum = colNonWhite.slice(startX, endX).reduce((a, b) => a + b, 0);
    console.log(`  ${p*10}% - ${(p+1)*10}% (x=${startX}..${endX}): count = ${sum}`);
  }
}

run().catch(console.error);
