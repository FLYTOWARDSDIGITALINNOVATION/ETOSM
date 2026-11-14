const fs = require('fs');
const buf = fs.readFileSync('frontend/public/logo1.png');
console.log('PNG width:', buf.readUInt32BE(16), 'height:', buf.readUInt32BE(20));
