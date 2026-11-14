const sharp = require('../frontend/node_modules/sharp');

async function inspect(path) {
  const meta = await sharp(path).metadata();
  const stats = await sharp(path).stats();
  console.log(path, 'dimensions:', meta.width, 'x', meta.height);
  console.log('Channels min/max:', stats.channels.map(c => ({ min: c.min, max: c.max, mean: Math.round(c.mean) })));
}

async function run() {
  await inspect('./scratch/icon_from_invoice.png');
  await inspect('./scratch/icon_from_logo1.png');
}

run().catch(console.error);
