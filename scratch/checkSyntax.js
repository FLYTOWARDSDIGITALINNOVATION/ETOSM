const fs = require('fs');
const esbuild = require('./frontend/node_modules/esbuild');

const files = [
  'frontend/src/App.jsx',
  'frontend/src/admin/AdminLayout.jsx',
  'frontend/src/admin/AdminSettings.jsx',
  'frontend/src/admin/AdminShippingSettings.jsx',
];

for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    esbuild.transformSync(code, { loader: 'jsx' });
    console.log(`PASS: ${f}`);
  } catch (err) {
    console.error(`FAIL: ${f}`, err.message);
  }
}
