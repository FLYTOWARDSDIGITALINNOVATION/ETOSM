// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://31.97.237.122:5007",
  ],
  credentials: true,
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Auto-rewrite /api to / so it works seamlessly on Live Server Nginx proxies
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    req.url = req.url.replace('/api/', '/');
  } else if (req.url === '/api') {
    req.url = '/';
  }
  next();
});

/* ================= MONGODB ================= */
// Force Node.js to use Google/Cloudflare DNS (fixes querySrv ECONNREFUSED on Windows)
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

/* ================= IMAGE UPLOAD ================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

/* ================= AUTH ================= */
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    if (!decoded.isAdmin) return res.status(403).json({ message: "Admin only" });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ================= SCHEMAS ================= */

// USER
const addressSchema = new mongoose.Schema({
  label: String,
  address: String,
  isDefault: Boolean,
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false },
  addresses: [addressSchema],
});

const User = mongoose.model("User", userSchema);

// CATEGORY
const categorySchema = new mongoose.Schema({
  name: { type: String, unique: true },
});
const Category = mongoose.model("Category", categorySchema);

// PRODUCT
const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  description: String,
  image: String,
  images: [String],

  // ⭐ NEW: Discount fields
  discountPercent: { type: Number, default: 0 },
  discountStart: Date,
  discountEnd: Date,

  averageRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },

  specifications: [{ label: String, value: String }],
});

// Add indexes for dashboard query performance
productSchema.index({ discountPercent: 1, discountStart: 1, discountEnd: 1 });

const Product = mongoose.model("Product", productSchema);

// ORDER
const orderSchema = new mongoose.Schema({
  productName: String,
  productId: String,
  quantity: Number,
  price: Number,
  userEmail: String,
  userName: String,
  shippingAddress: Object, // ✅ Added shippingAddress
  shippingMethod: String,  // ✅ Added shippingMethod
  paymentMethod: String,   // ✅ Added paymentMethod
  shippingCost: Number,    // ✅ Added shippingCost
  tax: Number,             // ✅ Added tax
  totalAmount: Number,     // ✅ Added totalAmount
  variation: String,       // ✅ Added variation (weight)
  phone: String,     // ✅ Added phone number
  status: { type: String, default: "Ordered" },
  createdAt: { type: Date, default: Date.now },
});

orderSchema.index({ createdAt: -1 });
const Order = mongoose.model("Order", orderSchema);

// CART
const cartSchema = new mongoose.Schema({
  userEmail: String,
  productId: String,
  name: String,
  unitPrice: Number,
  price: Number,
  img: String,
  qty: { type: Number, default: 1 },
  variation: String,      // ✅ Added variation (weight)
});
const Cart = mongoose.model("Cart", cartSchema);

// WISHLIST
const wishlistSchema = new mongoose.Schema({
  userEmail: String,
  productId: String,
  name: String,
  price: Number,
  image: String,
});
const Wishlist = mongoose.model("Wishlist", wishlistSchema);

// REVIEW
const reviewSchema = new mongoose.Schema({
  productId: String,
  userEmail: String,
  userName: String,
  rating: Number,
  comment: String,
  images: [String],
  createdAt: { type: Date, default: Date.now },
});
const Review = mongoose.model("Review", reviewSchema);

// CUSTOMER SUPPORT
// CUSTOMER SUPPORT CHAT
/* ================= SUPPORT CHAT ================= */

// NEW CHAT SCHEMA (Conversation-based)
const chatMessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["user", "admin"], required: true },
  text: { type: String, required: true },
  image: String,
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  subject: String,
  messages: [chatMessageSchema],
  lastUpdated: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", chatSchema);

// KEEPING LEGACY SUPPORT SCHEMA (Unused by new routes, preserving for safety)
const supportSchema = new mongoose.Schema({
  userEmail: String,
  userName: String,
  message: String,
  image: String,
  reply: String,
  replyAt: Date,
  createdAt: { type: Date, default: Date.now },
});
const Support = mongoose.model("Support", supportSchema);


// START/SEND MESSAGE (USER)
app.post("/support", upload.single("image"), async (req, res) => {
  try {
    const { userEmail, userName, message } = req.body;

    // Find existing chat for this user
    let chat = await Chat.findOne({ userEmail });

    const newMessage = {
      sender: "user",
      text: message,
      image: req.file ? `/uploads/${req.file.filename}` : "",
      timestamp: new Date()
    };

    if (chat) {
      chat.messages.push(newMessage);
      chat.lastUpdated = new Date();
      await chat.save();
    } else {
      chat = await Chat.create({
        userEmail,
        userName,
        subject: (message || "").substring(0, 50) + ((message || "").length > 50 ? "..." : ""),
        messages: [newMessage],
        lastUpdated: new Date()
      });
    }

    // Return the specific added message or the whole chat? 
    // FloatingChat expects { message: "...", chat: ... }
    res.json({ message: "Message sent", chat });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// COMPATIBILITY ROUTE (Some frontend versions might call /start)
app.post("/support/start", upload.single("image"), async (req, res) => {
  // Redirect logic to the main handler
  try {
    const { userEmail, userName, message } = req.body;
    let chat = await Chat.findOne({ userEmail });
    const newMessage = {
      sender: "user",
      text: message,
      image: req.file ? `/uploads/${req.file.filename}` : "",
      timestamp: new Date()
    };
    if (chat) {
      chat.messages.push(newMessage);
      chat.lastUpdated = new Date();
      await chat.save();
    } else {
      chat = await Chat.create({
        userEmail,
        userName,
        subject: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        messages: [newMessage],
        lastUpdated: new Date()
      });
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: "Failed to start chat" });
  }
});

// GET USER CHAT HISTORY
app.get("/support/history/:email", async (req, res) => {
  try {
    const chat = await Chat.findOne({ userEmail: req.params.email });
    // Return array of messages
    res.json(chat ? chat.messages : []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

// GET USER CHATS (Wait, old route was /support/user/:email returning array of chats?)
// If we want one chat per user (conversation style), we just return [chat] or the chat itself.
// The frontend calls /support/history mostly.
app.get("/support/user/:email", async (req, res) => {
  try {
    const chat = await Chat.findOne({ userEmail: req.params.email });
    res.json(chat ? [chat] : []);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

// GET ALL CHATS (ADMIN)
app.get("/admin/support", verifyAdmin, async (req, res) => {
  try {
    const chats = await Chat.find().sort({ lastUpdated: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

// GET ALL CHATS (ADMIN) - Alt route
app.get("/support/admin", verifyAdmin, async (req, res) => {
  try {
    const chats = await Chat.find().sort({ lastUpdated: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

// USER OR ADMIN SEND MESSAGE
app.put("/support/:id/message", upload.single("image"), async (req, res) => {
  try {
    const { sender, text } = req.body;
    const newMessage = {
      sender: sender || "admin",
      text,
      image: req.file ? `/uploads/${req.file.filename}` : "",
      timestamp: new Date()
    };

    const chat = await Chat.findByIdAndUpdate(
      req.params.id,
      {
        $push: { messages: newMessage },
        lastUpdated: new Date()
      },
      { new: true }
    );

    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

// DELETE CHAT (ADMIN)
app.delete("/admin/support/:id", verifyAdmin, async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ message: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete chat" });
  }
});

// (Moved app.listen to the end)


// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed });
    res.json({ message: "Signup successful" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Failed to signup" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
});

// ADD ADDRESS
app.post("/user/address", async (req, res) => {
  try {
    const { email, label, address } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses.push({ label, address, isDefault: false });
    await user.save();

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to add address" });
  }
});

// GET USER INFO (FOR PROFILE RELOAD)
app.get("/user/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

/* ================= ADMIN ================= */

// CATEGORY
app.post("/admin/category", verifyAdmin, async (req, res) => {
  try {
    const category = await Category.create({ name: req.body.name });
    res.json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Category already exists" });
    }
    res.status(500).json({ message: "Failed to create category" });
  }
});

app.get("/categories", async (req, res) => {
  try {
    res.json(await Category.find());
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

app.put("/admin/category/:id", verifyAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: "Failed to update category" });
  }
});

app.delete("/admin/category/:id", verifyAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete category" });
  }
});

// PRODUCT
app.post("/admin/product", verifyAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'galleryImages', maxCount: 5 }]), async (req, res) => {
  const mainImage = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : "";
  const galleryImages = req.files['galleryImages'] ? req.files['galleryImages'].map(f => `/uploads/${f.filename}`) : [];

  let specs = [];
  if (req.body.specifications) {
    try {
      specs = JSON.parse(req.body.specifications);
    } catch (e) {
      specs = req.body.specifications;
    }
  }

  const product = await Product.create({
    ...req.body,
    image: mainImage,
    images: galleryImages,
    specifications: specs
  });
  res.json(product);
});

app.delete("/admin/product/:id", verifyAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product deleted" });
});

// ✅ ADMIN ORDERS (ALL ORDERS, NO LIMIT)
app.get("/admin/orders", verifyAdmin, async (req, res) => {
  try {
    const query = {};

    if (req.query.from && req.query.to) {
      query.createdAt = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to + "T23:59:59"),
      };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


app.put("/admin/orders/:id", verifyAdmin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json({ message: "Status updated", order });
});

// ⭐ NEW: Optimized Admin Stats Route
app.get("/admin/dashboard-stats", verifyAdmin, async (req, res) => {
  try {
    const [productsCount, ordersCount, categoriesCount, recentOrders, activeDiscountsCount] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Category.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
      Product.countDocuments({
        discountPercent: { $gt: 0 },
        discountStart: { $lte: new Date() },
        discountEnd: { $gte: new Date() }
      })
    ]);

    res.json({
      stats: {
        products: productsCount,
        orders: ordersCount,
        discounts: activeDiscountsCount,
        categories: categoriesCount,
      },
      recentOrders: recentOrders
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

// ✅ USER ORDERS STATUS UPDATE (FOR DEMO/TESTING PURPOSE)
app.put("/orders/:id/status", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ message: "Status updated", order });
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
});
app.put(
  "/admin/product/:id",
  verifyAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "galleryImages", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      const updateData = { ...req.body };

      if (req.body.specifications) {
        try {
          updateData.specifications = JSON.parse(req.body.specifications);
        } catch (e) {
          updateData.specifications = req.body.specifications;
        }
      }

      // Handle main image update and deletion of old one
      if (req.files?.image) {
        if (product.image) {
          const oldPath = path.join(__dirname, product.image);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        updateData.image = `/uploads/${req.files.image[0].filename}`;
      }

      if (req.files?.galleryImages) {
        updateData.images = req.files.galleryImages.map(
          (f) => `/uploads/${f.filename}`
        );
      }

      // Handle direct sales price to discount percent conversion if salesPrice is provided
      if (req.body.salesPrice && req.body.price) {
        const originalPrice = parseFloat(req.body.price);
        const salesPrice = parseFloat(req.body.salesPrice);
        if (originalPrice > 0) {
          updateData.discountPercent = ((originalPrice - salesPrice) / originalPrice) * 100;
        }
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      res.json(updatedProduct);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update product" });
    }
  }
);


/* ================= USER ================= */

// PRODUCTS
app.get("/products", async (req, res) => res.json(await Product.find()));
app.get("/products/category/:category", async (req, res) => {
  try {
    const category = req.params.category;

    // Use exact case-insensitive match so 'Battery' does NOT match 'Battery Accessories'
    const products = await Product.find({
      category: { $regex: new RegExp(`^${category}$`, "i") }
    });

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/products/:id", async (req, res) =>
  res.json(await Product.findById(req.params.id))
);

// ORDERS
app.post("/orders", async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to create order" });
  }
});

app.get("/orders/:email", async (req, res) => {
  res.json(await Order.find({ userEmail: req.params.email }));
});

// ⭐ NEW: Public Recent Orders for Home Page proof
app.get("/orders/public/recent", async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select("productName userName createdAt totalAmount")
      .lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error loading recent orders" });
  }
});

// (Removed duplicate support routes as they conflicted with new conversation-based Chat routes)


/* ================= REVIEWS ================= */

// SUBMIT REVIEW
app.post("/reviews", upload.array("images", 5), async (req, res) => {

  try {
    const { productId, userEmail, userName, rating, comment } = req.body;

    const imagePaths = req.files
      ? req.files.map(file => `/uploads/${file.filename}`)
      : [];
    // 1. Create Review
    const newReview = await Review.create({
      productId,
      userEmail,
      userName,
      rating: Number(rating),
      comment,
      images: imagePaths,
    });

    // 2. Update Product Ratings
    const allReviews = await Review.find({ productId });
    const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
    const averageRating = totalRating / allReviews.length;

    await Product.findByIdAndUpdate(productId, {
      averageRating: Number(averageRating.toFixed(1)),

      ratingCount: allReviews.length,
    });

    res.json(newReview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit review" });
  }
});


app.get("/reviews/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId,
    }).sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

/* ================= CART ================= */

// GET CART ITEMS
app.get("/cart/:email", async (req, res) => {
  try {
    const cartItems = await Cart.find({ userEmail: req.params.email });
    res.json(cartItems);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cart items" });
  }
});

// ADD TO CART / UPDATE QUANTITY
app.post("/cart", async (req, res) => {
  try {
    const { userEmail, productId, name, price, img, qty } = req.body;

    let cartItem = await Cart.findOne({ userEmail, productId });

    if (cartItem) {
      cartItem.qty += qty;
      cartItem.price = cartItem.qty * cartItem.unitPrice;
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        userEmail,
        productId,
        name,
        unitPrice: price,
        price: price * qty,
        img,
        qty
      });
    }
    res.json(cartItem);
  } catch (err) {
    res.status(500).json({ message: "Failed to sync cart" });
  }
});

// REMOVE FROM CART
app.delete("/cart/:email/:productId", async (req, res) => {
  try {
    const { email, productId } = req.params;
    await Cart.findOneAndDelete({ userEmail: email, productId });
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove item" });
  }
});

// UPDATE QTY DIRECTLY
app.post("/cart/update-qty", async (req, res) => {
  try {
    const { userEmail, productId, qty } = req.body;
    const cartItem = await Cart.findOne({ userEmail, productId });

    if (cartItem) {
      cartItem.qty = qty;
      cartItem.price = cartItem.qty * cartItem.unitPrice;
      await cartItem.save();
      res.json(cartItem);
    } else {
      res.status(404).json({ message: "Cart item not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to update quantity" });
  }
});



/* ================= RAZORPAY PAYMENT ================= */

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET',
});

// CREATE ORDER
app.post("/payment/razorpay/order", async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    const options = {
      amount: Math.round(amount * 100), // Amount in paise, forced to integer
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Razorpay Order Error:", err);
    res.status(500).json({ message: "Failed to create Razorpay order" });
  }
});

// VERIFY PAYMENT
app.post("/payment/razorpay/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET';
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Signature is valid
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    console.error("Razorpay Verify Error:", err);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
});


/* ================= SERVER ================= */
const PORT = process.env.PORT || 5007;
app.listen(PORT, "0.0.0.0", () => console.log(`ETOSM Server running on port ${PORT}`));
