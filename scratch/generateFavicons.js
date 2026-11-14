const fs = require('fs');
const path = require('path');
const sharp = require('../frontend/node_modules/sharp');

async function buildFavicons() {
  const invoiceLogoPath = path.resolve('frontend/public/invoice_logo.png');
  
  // 1. Extract the raw icon from invoice_logo.png:
  // x: 0 to 167 (width: 168), y: 35 to 202 (height: 168)
  const rawIconBuf = await sharp(invoiceLogoPath)
    .extract({ left: 0, top: 35, width: 168, height: 168 })
    .toBuffer();

  // 2. Ensure brand red color #e3000f (R: 227, G: 0, B: 15)
  // while preserving alpha channel transparency
  const { data, info } = await sharp(rawIconBuf).raw().toBuffer({ resolveWithObject: true });
  const coloredData = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    coloredData[i] = 227;     // R: #e3
    coloredData[i + 1] = 0;   // G: #00
    coloredData[i + 2] = 15;  // B: #0f
    coloredData[i + 3] = a;   // original alpha
  }

  const brandIcon = sharp(coloredData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  });

  // Save base brand mark
  const brandIconPng = await brandIcon.png().toBuffer();
  fs.writeFileSync('scratch/brandIcon_clean.png', brandIconPng);
  console.log('Saved scratch/brandIcon_clean.png');

  // Helper function to create padded square icon
  async function makeIcon(size, paddingRatio = 0.1, background = { r: 0, g: 0, b: 0, alpha: 0 }) {
    const iconSize = Math.round(size * (1 - paddingRatio * 2));
    const resizedIcon = await sharp(brandIconPng)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: background
      }
    })
    .composite([{ input: resizedIcon, gravity: 'center' }])
    .png()
    .toBuffer();
  }

  // Generate individual PNGs:
  const icon16 = await makeIcon(16, 0.05); // slight padding for 16px
  const icon32 = await makeIcon(32, 0.08);
  const icon48 = await makeIcon(48, 0.10);
  const icon96 = await makeIcon(96, 0.12);
  const icon192 = await makeIcon(192, 0.12);
  const icon512 = await makeIcon(512, 0.12);
  
  // Apple Touch Icon (Apple recommends opaque background, #ffffff with brand red mark)
  const appleTouch = await makeIcon(180, 0.15, { r: 255, g: 255, b: 255, alpha: 1 });

  // Write to frontend/public
  fs.writeFileSync('frontend/public/favicon-16x16.png', icon16);
  fs.writeFileSync('frontend/public/favicon-32x32.png', icon32);
  fs.writeFileSync('frontend/public/favicon-48x48.png', icon48);
  fs.writeFileSync('frontend/public/favicon-96x96.png', icon96);
  fs.writeFileSync('frontend/public/logo192.png', icon192);
  fs.writeFileSync('frontend/public/logo512.png', icon512);
  fs.writeFileSync('frontend/public/apple-touch-icon.png', appleTouch);

  // Build multi-size favicon.ico (16, 32, 48)
  function createIco(images) {
    const count = images.length;
    const headerSize = 6;
    const dirEntrySize = 16;
    let offset = headerSize + count * dirEntrySize;

    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // 1 = ICO
    header.writeUInt16LE(count, 4);

    const dirEntries = [];
    for (let img of images) {
      const entry = Buffer.alloc(dirEntrySize);
      entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
      entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
      entry.writeUInt8(0, 2); // color palette count
      entry.writeUInt8(0, 3); // reserved
      entry.writeUInt16LE(1, 4); // color planes
      entry.writeUInt16LE(32, 6); // bits per pixel
      entry.writeUInt32LE(img.buffer.length, 8); // size of image data
      entry.writeUInt32LE(offset, 12); // offset
      dirEntries.push(entry);
      offset += img.buffer.length;
    }

    return Buffer.concat([header, ...dirEntries, ...images.map(img => img.buffer)]);
  }

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: icon16 },
    { width: 32, height: 32, buffer: icon32 },
    { width: 48, height: 48, buffer: icon48 }
  ]);
  fs.writeFileSync('frontend/public/favicon.ico', icoBuffer);
  console.log('Saved frontend/public/favicon.ico (size:', icoBuffer.length, 'bytes)');
}

buildFavicons().catch(console.error);
