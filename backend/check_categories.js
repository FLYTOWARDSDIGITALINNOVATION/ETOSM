const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://ETOSM:ETOSM@cluster0.nh4rh0w.mongodb.net/?appName=Cluster0');
const db = mongoose.connection;
db.once('open', async () => {
  const products = mongoose.connection.db.collection('products');
  const categories = await products.distinct('category');
  console.log("Categories in products:");
  console.log(categories);
  process.exit(0);
});
