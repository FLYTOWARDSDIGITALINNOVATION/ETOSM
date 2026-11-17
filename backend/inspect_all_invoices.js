require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const invoices = await db.collection('invoices').find({}, { projection: { invoiceNumber: 1, sourceOrderNumber: 1, grandTotal: 1, createdAt: 1 } }).sort({ createdAt: 1 }).toArray();
  console.log('--- ALL INVOICES IN DB ---');
  invoices.forEach(i => console.log(i.invoiceNumber, '| OrderRef:', i.sourceOrderNumber, '| Total:', i.grandTotal));

  const orders = await db.collection('orders').find({}, { projection: { invoiceNumber: 1, totalAmount: 1, createdAt: 1 } }).sort({ createdAt: 1 }).toArray();
  console.log('\n--- ALL ORDERS IN DB ---');
  orders.forEach(o => console.log('Order _id:', o._id.toString(), '| InvNum:', o.invoiceNumber, '| Total:', o.totalAmount));

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
