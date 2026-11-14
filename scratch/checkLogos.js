const sharp = require('../frontend/node_modules/sharp');

async function run() {
  // Let's inspect invoice_logo.png
  const meta = await sharp('./frontend/public/invoice_logo.png').metadata();
  console.log('invoice_logo meta:', meta);

  // Let's inspect logo1.png as well
  const meta1 = await sharp('./frontend/public/logo1.png').metadata();
  console.log('logo1 meta:', meta1);
}

run().catch(console.error);
