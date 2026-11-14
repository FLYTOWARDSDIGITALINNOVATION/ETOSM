const mongoose = require("../backend/node_modules/mongoose");

const MONGO_URI = "mongodb+srv://ETOSM:ETOSM@cluster0.nh4rh0w.mongodb.net/?appName=Cluster0";

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
    const Settings = mongoose.model("Settings", new mongoose.Schema({}, { strict: false }));
    const s = await Settings.findOne();
    console.log("Current Settings in DB:", JSON.stringify(s, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

check();
