const fs = require('fs');

function buildShippingLabelPdf(data) {
  const escapePdf = (str) => String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  const senderName = escapePdf(data.senderName || 'EToSM Technology');
  const senderAddr1 = escapePdf(data.senderAddr1 || '2/167, Ramapuram, Tiruchengodu, Namakkal, Tamil Nadu,');
  const senderPincode = escapePdf(data.senderPincode || '637202');
  const customerId = escapePdf(data.customerId || '1420189578');
  const senderPhone = escapePdf(data.senderPhone || '8807080216');

  const receiverName = escapePdf(data.receiverName || 'Stainless');
  const receiverAddr1 = escapePdf(data.receiverAddr1 || 'Bituhar suvani bastraly, Bituhar shailendra chaubey village bituhar');
  const receiverAddr2 = escapePdf(data.receiverAddr2 || 'post sothigaw, Madhubani, BIHAR 847240');
  const receiverPhone = escapePdf(data.receiverPhone || '8080001850');

  const trackingNo = escapePdf(data.trackingNo || 'tv100045in');

  let stream = '';
  stream += '1 1 1 rg 0 0 432 288 re f\n';
  stream += '0.69 0.10 0.17 rg 0 277 432 11 re f\n';
  stream += 'BT /F2 9 Tf 0.69 0.10 0.17 rg 1 0 0 1 17 258 Tm (SENDER) Tj ET\n';
  stream += `BT /F2 12 Tf 0 0 0 rg 1 0 0 1 17 243 Tm (${senderName}) Tj ET\n`;
  stream += `BT /F1 8 Tf 0.22 0.22 0.22 rg 1 0 0 1 17 228 Tm (${senderAddr1}) Tj ET\n`;
  stream += `BT /F1 8 Tf 0.22 0.22 0.22 rg 1 0 0 1 17 218 Tm (${senderPincode}) Tj ET\n`;
  stream += 'BT /F1 9 Tf 0.35 0.35 0.35 rg 1 0 0 1 17 204 Tm (CUSTOMER ID:) Tj ET\n';
  stream += `BT /F2 11 Tf 0.69 0.10 0.17 rg 1 0 0 1 100 203 Tm (${customerId}) Tj ET\n`;
  stream += `BT /F1 8 Tf 0.22 0.22 0.22 rg 1 0 0 1 282 203 Tm (Phone: ${senderPhone}) Tj ET\n`;
  stream += '0.82 0.82 0.82 RG 0.8 w 17 190 m 415 190 l S\n';
  stream += 'BT /F2 9 Tf 0.69 0.10 0.17 rg 1 0 0 1 17 176 Tm (RECEIVER) Tj ET\n';
  stream += `BT /F2 15 Tf 0 0 0 rg 1 0 0 1 17 157 Tm (${receiverName}) Tj ET\n`;
  stream += `BT /F1 10 Tf 0 0 0 rg 1 0 0 1 17 140 Tm (${receiverAddr1}) Tj ET\n`;
  if (receiverAddr2) {
    stream += `BT /F1 10 Tf 0 0 0 rg 1 0 0 1 17 130 Tm (${receiverAddr2}) Tj ET\n`;
  }
  stream += `BT /F2 10 Tf 0 0 0 rg 1 0 0 1 17 61 Tm (PHONE: ${receiverPhone}) Tj ET\n`;
  stream += '0.82 0.82 0.82 RG 0.8 w 17 51 m 415 51 l S\n';
  stream += 'BT /F1 8 Tf 0.35 0.35 0.35 rg 1 0 0 1 17 38 Tm (ARTICLE / TRACKING NO.) Tj ET\n';
  stream += `BT /F2 15 Tf 0 0 0 rg 1 0 0 1 17 18 Tm (${trackingNo}) Tj ET\n`;

  const streamLen = Buffer.byteLength(stream, 'latin1');

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [ 5 0 R ] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 432 288] /Rotate 90 /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>\nendobj\n';
  const obj6Header = `6 0 obj\n<< /Length ${streamLen} >>\nstream\n`;
  const obj6Footer = 'endstream\nendobj\n';

  let currentOffset = Buffer.byteLength(header, 'latin1');
  const o1 = currentOffset; currentOffset += Buffer.byteLength(obj1, 'latin1');
  const o2 = currentOffset; currentOffset += Buffer.byteLength(obj2, 'latin1');
  const o3 = currentOffset; currentOffset += Buffer.byteLength(obj3, 'latin1');
  const o4 = currentOffset; currentOffset += Buffer.byteLength(obj4, 'latin1');
  const o5 = currentOffset; currentOffset += Buffer.byteLength(obj5, 'latin1');
  const o6 = currentOffset;

  currentOffset += Buffer.byteLength(obj6Header, 'latin1') + streamLen + Buffer.byteLength(obj6Footer, 'latin1');

  const xrefOffset = currentOffset;
  const pad = (n) => String(n).padStart(10, '0');
  let xref = 'xref\n0 7\n0000000000 65535 f \n';
  xref += `${pad(o1)} 00000 n \n`;
  xref += `${pad(o2)} 00000 n \n`;
  xref += `${pad(o3)} 00000 n \n`;
  xref += `${pad(o4)} 00000 n \n`;
  xref += `${pad(o5)} 00000 n \n`;
  xref += `${pad(o6)} 00000 n \n`;
  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return header + obj1 + obj2 + obj3 + obj4 + obj5 + obj6Header + stream + obj6Footer + xref + trailer;
}

const generated = buildShippingLabelPdf({});
const orig = fs.readFileSync('C:/Users/sanka/.gemini/antigravity/brain/17fda1d6-b56d-4023-bacf-eef51979eb8b/.user_uploaded/media_1794889376212_cfbfd0ea.pdf', 'latin1');
console.log('Generated length:', generated.length, 'Original length:', orig.length);
console.log('Matches exactly?', generated === orig);
if (generated !== orig) {
  for (let i = 0; i < Math.max(generated.length, orig.length); i++) {
    if (generated[i] !== orig[i]) {
      console.log(`Diff at index ${i}: gen="${generated.slice(i, i+30)}" vs orig="${orig.slice(i, i+30)}"`);
      break;
    }
  }
}
