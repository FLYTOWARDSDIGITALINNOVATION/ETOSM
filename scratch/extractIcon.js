const sharp = require('../frontend/node_modules/sharp');

async function run() {
  const icon = sharp('./frontend/public/logo1.png')
    .extract({ left: 56, top: 68, width: 84, height: 83 });
  
  const { data } = await icon.raw().toBuffer({ resolveWithObject: true });
  const colorMap = {};
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i+3];
    if (a > 10) {
      const hex = '#' + [data[i], data[i+1], data[i+2]].map(x => x.toString(16).padStart(2, '0')).join('');
      colorMap[hex] = (colorMap[hex] || 0) + 1;
    }
  }
  console.log('Colors in logo1 icon:', Object.keys(colorMap).slice(0, 10));
}

run().catch(console.error);
