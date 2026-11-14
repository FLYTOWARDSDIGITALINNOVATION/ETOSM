const sharp = require('../frontend/node_modules/sharp');

async function run() {
  // Extract icon from invoice_logo.png
  await sharp('./frontend/public/invoice_logo.png')
    .extract({ left: 0, top: 35, width: 168, height: 168 })
    .toFile('./scratch/icon_from_invoice.png');

  // Extract icon from logo1.png
  await sharp('./frontend/public/logo1.png')
    .extract({ left: 56, top: 68, width: 84, height: 83 })
    .toFile('./scratch/icon_from_logo1.png');

  console.log('Both extracted to scratch directory');
}

run().catch(console.error);
