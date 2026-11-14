const sharp = require('../frontend/node_modules/sharp');

async function run() {
  const { data, info } = await sharp('./frontend/public/test_icon.png').raw().toBuffer({ resolveWithObject: true });
  const cx = Math.floor(info.width / 2);
  const cy = Math.floor(info.height / 2);
  const idx = (cy * info.width + cx) * 4;
  console.log('Center pixel RGBA:', data[idx], data[idx+1], data[idx+2], data[idx+3]);
  
  const colors = new Set();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] > 0) {
      colors.add(data[i] + ',' + data[i+1] + ',' + data[i+2]);
    }
  }
  console.log('Total non-transparent colors:', colors.size);
  console.log('Sample colors:', Array.from(colors).slice(0, 10));
}

run().catch(console.error);
