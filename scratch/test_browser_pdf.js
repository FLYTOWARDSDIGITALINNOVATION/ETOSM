const fs = require('fs');

function sanitizePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[₹]/g, 'Rs. ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function splitAddress(addr) {
  if (!addr) return { line1: '', line2: '' };
  const cleaned = String(addr).trim();
  if (cleaned.length <= 65) {
    return { line1: cleaned, line2: '' };
  }
  // Try splitting by comma near halfway
  const mid = Math.floor(cleaned.length / 2);
  const commaIdx = cleaned.lastIndexOf(',', mid + 15);
  if (commaIdx > 20) {
    return {
      line1: cleaned.slice(0, commaIdx + 1).trim(),
      line2: cleaned.slice(commaIdx + 1).trim()
    };
  }
  // Split by space near mid
  const spaceIdx = cleaned.lastIndexOf(' ', mid + 15);
  if (spaceIdx > 20) {
    return {
      line1: cleaned.slice(0, spaceIdx).trim(),
      line2: cleaned.slice(spaceIdx + 1).trim()
    };
  }
  return {
    line1: cleaned.slice(0, 65).trim(),
    line2: cleaned.slice(65).trim()
  };
}

function buildShippingLabelPdf(data) {
  const senderName = sanitizePdfText(data.senderName || 'EToSM Technology');
  const senderAddr1 = sanitizePdfText(data.senderAddr1 || '2/167, Ramapuram, Tiruchengodu, Namakkal, Tamil Nadu,');
  const senderPincode = sanitizePdfText(data.senderPincode || '637202');
  const customerId = sanitizePdfText(data.customerId || '1420189578');
  const senderPhone = sanitizePdfText(data.senderPhone || '8807080216');

  const receiverName = sanitizePdfText(data.receiverName || 'Stainless');
  let line1 = data.receiverAddr1;
  let line2 = data.receiverAddr2;
  if (!line2 && line1) {
    const sp = splitAddress(line1);
    line1 = sp.line1;
    line2 = sp.line2;
  }
  const receiverAddr1 = sanitizePdfText(line1 || 'Bituhar suvani bastraly, Bituhar shailendra chaubey village bituhar');
  const receiverAddr2 = sanitizePdfText(line2 || 'post sothigaw, Madhubani, BIHAR 847240');
  const receiverPhone = sanitizePdfText(data.receiverPhone || '8080001850');

  const trackingNo = sanitizePdfText(data.trackingNo || 'tv100045in');

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

  const streamLen = stream.length;

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [ 5 0 R ] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 432 288] /Rotate 90 /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>\nendobj\n';
  const obj6Header = `6 0 obj\n<< /Length ${streamLen} >>\nstream\n`;
  const obj6Footer = 'endstream\nendobj\n';

  let currentOffset = header.length;
  const o1 = currentOffset; currentOffset += obj1.length;
  const o2 = currentOffset; currentOffset += obj2.length;
  const o3 = currentOffset; currentOffset += obj3.length;
  const o4 = currentOffset; currentOffset += obj4.length;
  const o5 = currentOffset; currentOffset += obj5.length;
  const o6 = currentOffset;

  currentOffset += obj6Header.length + streamLen + obj6Footer.length;

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

const customData = {
  senderName: 'EToSM Technology',
  senderAddr1: '2/167, Ramapuram, Tiruchengodu, Namakkal, Tamil Nadu,',
  senderPincode: '637202',
  customerId: '9842512345',
  senderPhone: '8807080216',
  receiverName: 'Senthil Kumar',
  receiverAddr1: '45, Anna Nagar Cross Street, Near Bus Stand',
  receiverAddr2: 'Coimbatore, Tamil Nadu 641001',
  receiverPhone: '9876543210',
  trackingNo: 'ET100045IN'
};

const pdfOut = buildShippingLabelPdf(customData);
console.log('Custom PDF generated successfully, byte length:', pdfOut.length);
fs.writeFileSync('scratch/custom_label.pdf', pdfOut, 'latin1');
console.log('Written to scratch/custom_label.pdf');
