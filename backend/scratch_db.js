const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }));
    const products = await Product.find({}, { name: 1, price: 1, discountPercent: 1, discountStart: 1, discountEnd: 1 });
    console.log(JSON.stringify(products, null, 2));
    mongoose.connection.close();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
