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
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// Set up Nodemailer with Gmail (if credentials exist) or Ethereal for testing
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log("Real Gmail service configured via App Password.");
} else {
  nodemailer.createTestAccount().then((account) => {
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
    console.log("Fake Email service configured.");
  }).catch(err => {
    console.error("Failed to create Ethereal testing account", err);
  });
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID");

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
  .then(async () => {
    console.log("MongoDB Connected");
    await migrateSlugs();
    await migrateProductIds();
    await migrateProductVisibility();
    await migrateBestsellers();
    await seedGoogleReviews();
    await seedAdminUser();
    await seedSubcategories();
  })
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

// CUSTOMER SCHEMA (Admin Module 6: Customer Management)
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true }, // Mobile number
  email: { type: String, default: "" },
  company: { type: String, default: "" },
  address: { type: String, default: "" }, // Full Address
  city: { type: String, default: "" },
  state: { type: String, default: "Tamil Nadu" },
  pincode: { type: String, default: "" },
  gstin: { type: String, default: "" },
  notes: { type: String, default: "" },
  isRegistered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ createdAt: -1 });
const Customer = mongoose.model("Customer", customerSchema);

// CATEGORY
const categorySchema = new mongoose.Schema({
  name: { type: String, unique: true },
  subcategories: { type: [String], default: [] }
});
const Category = mongoose.model("Category", categorySchema);

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function escapeRegex(string) {
  return string ? string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') : '';
}

// PRODUCT
const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  subcategory: { type: String, default: "" },
  price: Number,
  description: String,
  image: String,
  images: [String],
  slug: { type: String, unique: true, sparse: true },
  gstPercent: { type: Number, default: 18 },
  pdfUrl: { type: String, default: "" },

  // ⭐ NEW: Discount fields
  discountPercent: { type: Number, default: 0 },
  discountStart: Date,
  discountEnd: Date,

  // ⭐ NEW: Inventory
  stock: { type: Number, default: 0 },

  averageRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },

  isVisible: { type: Boolean, default: true },
  isBestseller: { type: Boolean, default: false },

  sku: { type: Number, default: null },
  productId: { type: String, trim: true },

  specifications: [{ label: String, value: String }],
});

// Add indexes for dashboard query performance
productSchema.index({ discountPercent: 1, discountStart: 1, discountEnd: 1 });
productSchema.index({ productId: 1 });

productSchema.pre("save", async function () {
  if (this.isModified("name") || !this.slug) {
    let baseSlug = generateSlug(this.name || "");
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Product.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter++}`;
    }
    this.slug = slug;
  }

  if (!this.productId) {
    if (this.sku) {
      this.productId = `PRD-${this.sku}`;
    } else {
      this.productId = `PRD-${Math.floor(10000 + Math.random() * 90000)}`;
    }
  }
});

const Product = mongoose.model("Product", productSchema);

async function migrateSlugs() {
  try {
    const ProductModel = mongoose.model("Product");
    const products = await ProductModel.find({ $or: [{ slug: { $exists: false } }, { slug: "" }, { slug: null }] });
    for (let product of products) {
      let baseSlug = generateSlug(product.name || "");
      let slug = baseSlug;
      let counter = 1;
      while (await ProductModel.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }
      product.slug = slug;
      await product.save();
      console.log(`Migrated product: "${product.name}" -> slug: "${slug}"`);
    }
  } catch (err) {
    console.error("Slug migration failed:", err);
  }
}

async function migrateProductIds() {
  try {
    const ProductModel = mongoose.model("Product");
    const products = await ProductModel.find({
      $or: [{ productId: { $exists: false } }, { productId: "" }, { productId: null }]
    });
    for (let product of products) {
      const pid = product.sku ? `PRD-${product.sku}` : `PRD-${product._id.toString().slice(-5).toUpperCase()}`;
      product.productId = pid;
      await product.save();
    }
    if (products.length > 0) {
      console.log(`Migrated ${products.length} products with standard Product IDs.`);
    }
  } catch (err) {
    console.error("ProductId migration failed:", err);
  }
}

async function migrateProductVisibility() {
  try {
    const ProductModel = mongoose.model("Product");
    // Only initialise the field for products where it has never been set.
    // Do NOT touch products that have explicitly been set to false by the admin.
    const result = await ProductModel.updateMany(
      { isVisible: { $exists: false } },
      { $set: { isVisible: true } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Migrated ${result.modifiedCount} products to isVisible: true (field initialisation only)`);
    }
  } catch (err) {
    console.error("Product visibility migration failed:", err);
  }
}

async function migrateBestsellers() {
  try {
    // Ensure any products marked as bestsellers have isVisible: true
    await Product.updateMany({ isBestseller: true }, { $set: { isVisible: true } });
  } catch (err) {
    console.error("migrateBestsellers error:", err);
  }
}

async function seedGoogleReviews() {
  try {
    const count = await GoogleReview.countDocuments();
    if (count === 0) {
      await GoogleReview.create([
        {
          name: "Rajesh Kumar",
          role: "EV Design Engineer",
          rating: 5,
          text: "Absolutely top-grade BMS! Built a custom 72V battery pack for my EV conversion using their smart BMS. The cell balancing is accurate to 2mV. Best tech store in India for energy storage components.",
          isApproved: true
        },
        {
          name: "Dr. Ananya Sen",
          role: "Acoustic Consultant",
          rating: 5,
          text: "Used their 250V electrolytic capacitors for a power supply redesign in a high-fidelity valve amplifier. Extremely low ESR and stable capacitance under load. Audio clarity is amazing.",
          isApproved: true
        },
        {
          name: "Vikram Malhotra",
          role: "Industrial IoT Lead",
          rating: 5,
          text: "Quick shipping and excellent customer support. We use their customized battery packs for our outdoor telemetry sensor nodes. Great thermal management and reliable battery protection.",
          isApproved: true
        }
      ]);
      console.log("Seeded initial Google reviews successfully.");
    }
  } catch (err) {
    console.error("Failed to seed Google reviews:", err);
  }
}

async function seedAdminUser() {
  try {
    const user = await User.findOne({ email: "admin@gmail.com" });
    if (!user) {
      const hashed = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "System Admin",
        email: "admin@gmail.com",
        password: hashed,
        isAdmin: true
      });
      console.log("Seeded admin user successfully.");
    }
  } catch (err) {
    console.error("Failed to seed admin user:", err);
  }
}

async function seedSubcategories() {
  try {
    const defaultElecSubs = [
      "Connectors",
      "Resistor",
      "Capacitor",
      "MOSFET",
      "Transistor",
      "Diode & Rectifier",
      "Power Management ICs",
      "Gate Driver",
      "Operational Amplifiers",
      "Audio IC",
      "Voltage Regulators",
      "Microcontrollers",
      "NTC",
      "Fuse",
      "Modules"
    ];

    // 1. Electronics Components Category
    let elecCat = await Category.findOne({ name: "Electronics Components" });
    if (elecCat) {
      const merged = Array.from(new Set([...(elecCat.subcategories || []), ...defaultElecSubs]));
      elecCat.subcategories = merged;
      await elecCat.save();
    } else {
      await Category.create({
        name: "Electronics Components",
        subcategories: defaultElecSubs
      });
      console.log("Created & Seeded Electronics Components category.");
    }

    // 2. Battery Packs Category
    let battCat = await Category.findOne({ name: "BATTERY PACKS" });
    if (battCat) {
      if (!battCat.subcategories || battCat.subcategories.length === 0) {
        battCat.subcategories = [
          "Lithium-Ion",
          "LiFePO4",
          "BMS Boards",
          "Battery Accessories"
        ];
        await battCat.save();
        console.log("Seeded BATTERY PACKS subcategories.");
      }
    } else {
      await Category.create({
        name: "BATTERY PACKS",
        subcategories: [
          "Lithium-Ion",
          "LiFePO4",
          "BMS Boards",
          "Battery Accessories"
        ]
      });
      console.log("Created & Seeded BATTERY PACKS category.");
    }
  } catch (err) {
    console.error("Failed to seed subcategories:", err);
  }
}

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
  phone: String,           // ✅ Added phone number
  invoiceNumber: String,   // ✅ Distinct Invoice ID (e.g. INV-104928)
  razorpayPaymentId: String, // ✅ Distinct Razorpay Payment ID (e.g. pay_XXXX)
  razorpayOrderId: String,   // ✅ Distinct Razorpay Order ID (e.g. order_XXXX)
  sku: { type: Number, default: null }, // ✅ Product SKU for Admin
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
  gstPercent: { type: Number, default: 18 },
  stock: Number,          // ✅ Added stock
  sku: { type: Number, default: null }, // ✅ Added sku
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

// GOOGLE REVIEW
const googleReviewSchema = new mongoose.Schema({
  name: String,
  role: String,
  rating: Number,
  text: String,
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const GoogleReview = mongoose.model("GoogleReview", googleReviewSchema);

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

// SETTINGS
const settingsSchema = new mongoose.Schema({
  expressShippingPrice: { type: Number, default: 9.99 },
  standardShippingPrice: { type: Number, default: 0 }
});
const Settings = mongoose.model("Settings", settingsSchema);

// QUOTATION / BILLING SCHEMA (Admin Module 5: Quotation Management)
const quotationSchema = new mongoose.Schema({
  docType: { type: String, enum: ["quotation", "bill"], default: "quotation" }, // "quotation" or "bill"
  quotationNumber: { type: String, required: true, unique: true },
  docNumber: { type: String }, // Backwards compatibility
  quotationDate: { type: Date, default: Date.now },
  validUntil: { type: Date },
  customerId: { type: String, default: "" },
  customerName: { type: String, required: true },
  customerEmail: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  customerCompany: { type: String, default: "" },
  customerAddress: { type: String, default: "" },
  customerGstin: { type: String, default: "" },
  placeOfSupply: { type: String, default: "Tamil Nadu (33)" },
  items: [
    {
      productId: { type: String, default: "" },
      productRef: { type: String, default: "" },
      name: { type: String, required: true },
      description: { type: String, default: "" },
      sku: { type: String, default: "" },
      quantity: { type: Number, default: 1, min: 1 },
      unitPrice: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      taxableAmount: { type: Number, default: 0 },
      gstPercent: { type: Number, default: 18 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      igstAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 }
    }
  ],
  grossSubtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  quotationDiscountPercent: { type: Number, default: 0 },
  quotationDiscountAmount: { type: Number, default: 0 },
  taxableSubtotal: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  isInterState: { type: Boolean, default: false },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  shippingCharges: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Draft", "Pending", "Sent", "Approved", "Rejected", "Converted to Invoice"],
    default: "Pending"
  },
  convertedInvoiceId: { type: String, default: "" },
  convertedInvoiceNumber: { type: String, default: "" },
  convertedAt: { type: Date },
  notes: {
    type: String,
    default: "1. Quotation prices are valid for 30 days from date of issue.\n2. Taxes as applicable at the time of invoicing.\n3. Delivery timeline: 3-5 business days upon PO confirmation."
  },
  termsAndConditions: { type: String, default: "" },
  bankDetails: {
    bankName: { type: String, default: "State Bank of India" },
    accountNumber: { type: String, default: "38920192837" },
    ifscCode: { type: String, default: "SBIN0001234" },
    branch: { type: String, default: "Coimbatore Main Branch" },
    upiId: { type: String, default: "etosm@sbi" }
  },
  preparedBy: { type: String, default: "Sales & Tech Support" },
  createdAt: { type: Date, default: Date.now }
});
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ quotationNumber: 1 });
const Quotation = mongoose.model("Quotation", quotationSchema);

// INVOICE SCHEMA (Admin Module 2: Create Invoice & Billing)
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  customerId: { type: String, default: "" },
  customerName: { type: String, required: true },
  customerEmail: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  customerCompany: { type: String, default: "" },
  customerAddress: { type: String, default: "" },
  customerGstin: { type: String, default: "" },
  placeOfSupply: { type: String, default: "Tamil Nadu (33)" },
  paymentMode: { type: String, default: "Bank Transfer" }, // "Cash", "UPI", "Bank Transfer", "Cheque", "Card"
  paymentStatus: { type: String, default: "Paid" }, // "Paid", "Pending", "Partially Paid", "Cancelled"
  amountPaid: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentReference: { type: String, default: "" },
  paymentNotes: { type: String, default: "" },
  lastPaymentDate: { type: Date },
  paymentHistory: [
    {
      amount: { type: Number, default: 0 },
      paymentDate: { type: Date, default: Date.now },
      paymentMode: { type: String, default: "Bank Transfer" },
      reference: { type: String, default: "" },
      notes: { type: String, default: "" },
      recordedBy: { type: String, default: "Admin" }
    }
  ],
  items: [
    {
      productId: { type: String, default: "" },
      productRef: { type: String, default: "" },
      name: { type: String, required: true },
      description: { type: String, default: "" },
      sku: { type: String, default: "" },
      quantity: { type: Number, default: 1, min: 1 },
      unitPrice: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      taxableAmount: { type: Number, default: 0 },
      gstPercent: { type: Number, default: 18 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      igstAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 }
    }
  ],
  grossSubtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  invoiceDiscountPercent: { type: Number, default: 0 },
  invoiceDiscountAmount: { type: Number, default: 0 },
  taxableSubtotal: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  isInterState: { type: Boolean, default: false }, // true = IGST, false = CGST + SGST
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  shippingCharges: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  notes: { type: String, default: "1. Goods once sold will not be taken back or exchanged.\n2. Warranty terms as per standard manufacturer policy.\n3. Subject to local jurisdiction." },
  bankDetails: {
    bankName: { type: String, default: "State Bank of India" },
    accountNumber: { type: String, default: "38920192837" },
    ifscCode: { type: String, default: "SBIN0001234" },
    branch: { type: String, default: "Coimbatore Main Branch" },
    upiId: { type: String, default: "etosm@sbi" }
  },
  createdAt: { type: Date, default: Date.now }
});
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 });
const Invoice = mongoose.model("Invoice", invoiceSchema);

// CREDIT NOTE SCHEMA (Admin Module 8: Credit Notes)
const creditNoteSchema = new mongoose.Schema({
  creditNoteNumber: { type: String, required: true, unique: true },
  creditNoteDate: { type: Date, default: Date.now },
  invoiceId: { type: String, default: "" },
  invoiceNumber: { type: String, default: "" },
  customerId: { type: String, default: "" },
  customerName: { type: String, required: true },
  customerEmail: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  customerCompany: { type: String, default: "" },
  customerAddress: { type: String, default: "" },
  customerGstin: { type: String, default: "" },
  placeOfSupply: { type: String, default: "Tamil Nadu (33)" },
  reason: {
    type: String,
    default: "Goods Returned"
  },
  items: [
    {
      productId: { type: String, default: "" },
      name: { type: String, required: true },
      description: { type: String, default: "" },
      sku: { type: String, default: "" },
      quantity: { type: Number, default: 1, min: 1 },
      unitPrice: { type: Number, default: 0 },
      taxableAmount: { type: Number, default: 0 },
      gstPercent: { type: Number, default: 18 },
      taxAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 }
    }
  ],
  subtotal: { type: Number, default: 0 },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalCreditAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Issued", "Applied to Invoice", "Refunded", "Closed"],
    default: "Issued"
  },
  appliedInvoiceNumber: { type: String, default: "" },
  refundMode: { type: String, default: "Bank Transfer" },
  refundReference: { type: String, default: "" },
  refundDate: { type: Date },
  notes: { type: String, default: "" },
  createdBy: { type: String, default: "Admin" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
creditNoteSchema.index({ createdAt: -1 });
creditNoteSchema.index({ creditNoteNumber: 1 });
const CreditNote = mongoose.model("CreditNote", creditNoteSchema);


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
    if (!isMatch) return res.status(401).json({ message: "Wrong password" });

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

// FORGOT PASSWORD
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "SECRET_KEY", { expiresIn: "15m" });
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    if (transporter) {
      const info = await transporter.sendMail({
        from: `"ETOSM Support" <${process.env.EMAIL_USER || "support@etosm.com"}>`,
        to: email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
        html: `<p>You requested a password reset.</p><p><a href="${resetLink}">Click here to reset your password</a></p>`
      });
      if (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your_email_address_here')) {
        console.log("Password reset email actually sent to: %s", email);
      } else {
        console.log("Password reset email sent (Test Mode): %s", nodemailer.getTestMessageUrl(info));
      }
      res.json({ message: "Password reset link sent to your email." });
    } else {
      console.log(`Fallback: Password reset link for ${email}: ${resetLink}`);
      res.json({ message: "Password reset link logged to server console." });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to process forgot password" });
  }
});

// RESET PASSWORD
app.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: "Invalid request" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "Password has been successfully reset." });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset token has expired" });
    }
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// GOOGLE LOGIN
app.post("/google-login-custom", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Create user if they don't exist
      user = await User.create({ name, email, password: "" });
    }

    const jwtToken = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ message: "Server Error during Google Login" });
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

// SETTINGS
app.get("/settings", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

app.put("/admin/settings", verifyAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      settings = await Settings.findOneAndUpdate({}, req.body, { new: true });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// CATEGORY
app.post("/admin/category", verifyAdmin, async (req, res) => {
  try {
    const { name, subcategories } = req.body;
    let subcategoriesArray = [];
    if (subcategories) {
      subcategoriesArray = Array.isArray(subcategories)
        ? subcategories
        : JSON.parse(subcategories);
    }
    const category = await Category.create({
      name,
      subcategories: subcategoriesArray.map(s => s.trim()).filter(Boolean)
    });
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
    const { name, subcategories } = req.body;
    let updateData = {};
    if (name) updateData.name = name;
    if (subcategories !== undefined) {
      const subcategoriesArray = Array.isArray(subcategories)
        ? subcategories
        : JSON.parse(subcategories);
      updateData.subcategories = subcategoriesArray.map(s => s.trim()).filter(Boolean);
    }
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
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
app.post("/admin/product", verifyAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'galleryImages', maxCount: 5 }, { name: 'pdf', maxCount: 1 }]), async (req, res) => {
  const mainImage = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : "";
  const galleryImages = req.files['galleryImages'] ? req.files['galleryImages'].map(f => `/uploads/${f.filename}`) : [];
  const pdfFile = req.files['pdf'] ? `/uploads/${req.files['pdf'][0].filename}` : "";

  let specs = [];
  if (req.body.specifications) {
    try {
      specs = JSON.parse(req.body.specifications);
    } catch (e) {
      specs = req.body.specifications;
    }
  }

  let genProductId = req.body.productId ? String(req.body.productId).trim() : "";
  if (!genProductId) {
    if (req.body.sku) {
      genProductId = `PRD-${req.body.sku}`;
    } else {
      genProductId = `PRD-${Math.floor(10000 + Math.random() * 90000)}`;
    }
  }

  const product = await Product.create({
    ...req.body,
    productId: genProductId,
    gstPercent: req.body.gstPercent !== undefined ? Number(req.body.gstPercent) : 18,
    stock: req.body.stock !== undefined ? Number(req.body.stock) : 0,
    sku: req.body.sku !== undefined && req.body.sku !== "" ? Number(req.body.sku) : null,
    isBestseller: req.body.isBestseller === true || req.body.isBestseller === "true",
    image: mainImage,
    images: galleryImages,
    pdfUrl: pdfFile,
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

// ✅ GET PRODUCTS WITH STATS (ADMIN)
app.get("/admin/products-stats", verifyAdmin, async (req, res) => {
  try {
    const products = await Product.find().lean();

    const orderStats = await Order.aggregate([
      { $group: { _id: "$productId", orderCount: { $sum: 1 }, totalQuantityOrdered: { $sum: "$quantity" } } }
    ]);

    const statsMap = {};
    orderStats.forEach(stat => {
      if (stat._id) {
        statsMap[stat._id.toString()] = stat;
      }
    });

    const productsWithStats = products.map(p => {
      const stats = statsMap[p._id.toString()] || { orderCount: 0, totalQuantityOrdered: 0 };
      return {
        ...p,
        orderCount: stats.orderCount,
        totalQuantityOrdered: stats.totalQuantityOrdered
      };
    });

    res.json(productsWithStats);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product stats" });
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

// ============================================================================
// ADMIN CUSTOMER MANAGEMENT (Module 6: Customer Management)
// Add, view, and manage customer details; store customer name, mobile number,
// and address; select saved customers while creating invoices and quotations.
// ============================================================================

// GET ALL CUSTOMERS WITH STATS & SEARCH/FILTER (ADMIN)
app.get("/admin/customers", verifyAdmin, async (req, res) => {
  try {
    const { search } = req.query;

    // 1. Fetch custom admin-created customers
    const customCustomers = await Customer.find().sort({ createdAt: -1 }).lean();

    // 2. Fetch registered users
    const registeredUsers = await User.find({ isAdmin: { $ne: true } }).select("-password").lean();

    // 3. Fetch order aggregation stats
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: { $toLower: "$userEmail" },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: { $ifNull: ["$totalAmount", "$price"] } },
          lastOrderDate: { $max: "$createdAt" },
          userNames: { $addToSet: "$userName" },
          phones: { $addToSet: "$phone" },
          shippingAddresses: { $addToSet: "$shippingAddress" },
          ordersList: {
            $push: {
              _id: "$_id",
              invoiceNumber: "$invoiceNumber",
              productName: "$productName",
              productId: "$productId",
              sku: "$sku",
              quantity: "$quantity",
              totalAmount: "$totalAmount",
              price: "$price",
              status: "$status",
              createdAt: "$createdAt"
            }
          }
        }
      }
    ]);

    const statsMap = {};
    orderStats.forEach(stat => {
      if (stat._id) {
        statsMap[stat._id.toLowerCase()] = stat;
      }
    });

    const customersMap = {};

    // A. Add custom admin-managed customers first (highest priority)
    customCustomers.forEach(cust => {
      const key = cust._id.toString();
      const emailKey = (cust.email || "").toLowerCase();
      const stats = (emailKey && statsMap[emailKey]) ? statsMap[emailKey] : null;

      customersMap[key] = {
        _id: cust._id,
        name: cust.name,
        phone: cust.phone || "",
        email: cust.email || "",
        company: cust.company || "",
        address: cust.address || (cust.city ? `${cust.city}, ${cust.state || ""}` : ""),
        city: cust.city || "",
        state: cust.state || "Tamil Nadu",
        pincode: cust.pincode || "",
        gstin: cust.gstin || "",
        notes: cust.notes || "",
        isRegistered: cust.isRegistered || false,
        isCustom: true,
        orderCount: stats ? stats.orderCount : 0,
        totalSpent: stats ? stats.totalSpent : 0,
        lastOrderDate: stats ? stats.lastOrderDate : cust.createdAt,
        orders: stats ? (stats.ordersList || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [],
        createdAt: cust.createdAt || new Date()
      };
    });

    // B. Process registered users (if not already added via custom customer with same email or phone)
    registeredUsers.forEach(u => {
      const emailKey = (u.email || "").toLowerCase();
      // Check if already in map by email
      const alreadyExists = Object.values(customersMap).some(
        c => (c.email && c.email.toLowerCase() === emailKey) || (u.phone && c.phone === u.phone)
      );
      if (alreadyExists) return;

      const stats = (emailKey && statsMap[emailKey]) ? statsMap[emailKey] : {
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: u.createdAt || null,
        userNames: [],
        phones: [],
        shippingAddresses: [],
        ordersList: []
      };

      const phone = u.phone || (stats.phones.find(p => p) || "");
      const name = u.name || (stats.userNames.find(n => n) || "Customer");
      let addrStr = "";
      if (Array.isArray(u.addresses) && u.addresses.length > 0) {
        const def = u.addresses.find(a => a.isDefault) || u.addresses[0];
        addrStr = def.address || "";
      } else if (stats.shippingAddresses && stats.shippingAddresses.length > 0) {
        const sa = stats.shippingAddresses[0];
        if (typeof sa === "object") {
          addrStr = `${sa.address || ""}, ${sa.city || ""}, ${sa.state || ""} ${sa.zipCode || ""}`.trim();
        } else {
          addrStr = String(sa);
        }
      }

      customersMap[u._id.toString()] = {
        _id: u._id,
        name: name,
        email: u.email || "",
        phone: phone,
        company: "",
        address: addrStr,
        city: "",
        state: "Tamil Nadu",
        pincode: "",
        gstin: "",
        notes: "",
        isRegistered: true,
        isCustom: false,
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate,
        orders: (stats.ordersList || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        createdAt: u.createdAt || new Date()
      };
    });

    // C. Process non-registered customers from orders
    orderStats.forEach(stat => {
      const emailKey = (stat._id || "").toLowerCase();
      const alreadyExists = Object.values(customersMap).some(
        c => c.email && c.email.toLowerCase() === emailKey
      );
      if (!alreadyExists && emailKey) {
        const name = stat.userNames.find(n => n) || "Guest Customer";
        const phone = stat.phones.find(p => p) || "";
        let addrStr = "";
        if (stat.shippingAddresses && stat.shippingAddresses.length > 0) {
          const sa = stat.shippingAddresses[0];
          if (typeof sa === "object") {
            addrStr = `${sa.address || ""}, ${sa.city || ""}, ${sa.state || ""} ${sa.zipCode || ""}`.trim();
          } else {
            addrStr = String(sa);
          }
        }

        customersMap[emailKey] = {
          _id: emailKey,
          name: name,
          email: emailKey,
          phone: phone,
          company: "",
          address: addrStr,
          city: "",
          state: "Tamil Nadu",
          pincode: "",
          gstin: "",
          notes: "",
          isRegistered: false,
          isCustom: false,
          orderCount: stat.orderCount,
          totalSpent: stat.totalSpent,
          lastOrderDate: stat.lastOrderDate,
          orders: (stat.ordersList || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
          createdAt: stat.lastOrderDate || new Date()
        };
      }
    });

    let customersList = Object.values(customersMap);

    // Search filter
    if (search && search.trim() !== "") {
      const q = search.trim().toLowerCase();
      customersList = customersList.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    res.json({ customers: customersList });
  } catch (err) {
    console.error("Failed to fetch customers:", err);
    res.status(500).json({ message: "Failed to fetch customers", error: err.message });
  }
});

// CREATE NEW CUSTOMER (ADMIN MODULE 6)
app.post("/admin/customers", verifyAdmin, async (req, res) => {
  try {
    const { name, phone, email, company, address, city, state, pincode, gstin, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Customer name is required" });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const newCustomer = await Customer.create({
      name: name.trim(),
      phone: phone.trim(),
      email: (email || "").trim(),
      company: (company || "").trim(),
      address: (address || "").trim(),
      city: (city || "").trim(),
      state: (state || "Tamil Nadu").trim(),
      pincode: (pincode || "").trim(),
      gstin: (gstin || "").trim(),
      notes: (notes || "").trim()
    });

    res.status(201).json({ message: "Customer created successfully", customer: newCustomer });
  } catch (err) {
    console.error("Failed to create customer:", err);
    res.status(500).json({ message: "Failed to create customer", error: err.message });
  }
});

// UPDATE CUSTOMER (ADMIN MODULE 6)
app.put("/admin/customers/:id", verifyAdmin, async (req, res) => {
  try {
    const { name, phone, email, company, address, city, state, pincode, gstin, notes } = req.body;

    // Check if ID belongs to Customer collection
    let customer = await Customer.findById(req.params.id);
    if (customer) {
      if (name) customer.name = name.trim();
      if (phone) customer.phone = phone.trim();
      if (email !== undefined) customer.email = email.trim();
      if (company !== undefined) customer.company = company.trim();
      if (address !== undefined) customer.address = address.trim();
      if (city !== undefined) customer.city = city.trim();
      if (state !== undefined) customer.state = state.trim();
      if (pincode !== undefined) customer.pincode = pincode.trim();
      if (gstin !== undefined) customer.gstin = gstin.trim();
      if (notes !== undefined) customer.notes = notes.trim();
      customer.updatedAt = new Date();
      await customer.save();
      return res.json({ message: "Customer details updated successfully", customer });
    }

    // If ID was from a User or guest order, create a dedicated Customer entry for it
    const createdFromUser = await Customer.create({
      name: name ? name.trim() : "Customer",
      phone: phone ? phone.trim() : "",
      email: email ? email.trim() : "",
      company: company ? company.trim() : "",
      address: address ? address.trim() : "",
      city: city ? city.trim() : "",
      state: state || "Tamil Nadu",
      pincode: pincode ? pincode.trim() : "",
      gstin: gstin ? gstin.trim() : "",
      notes: notes ? notes.trim() : ""
    });

    res.json({ message: "Customer profile upgraded and saved", customer: createdFromUser });
  } catch (err) {
    console.error("Failed to update customer:", err);
    res.status(500).json({ message: "Failed to update customer", error: err.message });
  }
});

// DELETE CUSTOMER (ADMIN MODULE 6)
app.delete("/admin/customers/:id", verifyAdmin, async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Customer record deleted successfully" });
  } catch (err) {
    console.error("Failed to delete customer:", err);
    res.status(500).json({ message: "Failed to delete customer", error: err.message });
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
    { name: "pdf", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      const updateData = { ...req.body };
      if (req.body.isBestseller !== undefined) {
        updateData.isBestseller = req.body.isBestseller === true || req.body.isBestseller === "true";
      }
      if (req.body.isVisible !== undefined) {
        updateData.isVisible = req.body.isVisible === true || req.body.isVisible === "true";
      }
      if (req.body.gstPercent !== undefined) {
        updateData.gstPercent = Number(req.body.gstPercent);
      }

      if (req.body.restockQuantity !== undefined && req.body.restockQuantity !== "") {
        updateData.$inc = { stock: Number(req.body.restockQuantity) };
        delete updateData.restockQuantity;
      } else if (req.body.stock !== undefined) {
        updateData.stock = Number(req.body.stock);
      }

      if (req.body.sku !== undefined) {
        updateData.sku = req.body.sku !== "" ? Number(req.body.sku) : null;
      }

      if (req.body.productId !== undefined && req.body.productId !== "") {
        updateData.productId = String(req.body.productId).trim();
      }

      if (req.body.name) {
        let baseSlug = generateSlug(req.body.name);
        let slug = baseSlug;
        let counter = 1;
        while (await Product.findOne({ slug, _id: { $ne: req.params.id } })) {
          slug = `${baseSlug}-${counter++}`;
        }
        updateData.slug = slug;
      }

      if (req.body.specifications) {
        try {
          updateData.specifications = JSON.parse(req.body.specifications);
        } catch (e) {
          updateData.specifications = req.body.specifications;
        }
      }

      if (req.body.existingImages) {
        try {
          updateData.images = JSON.parse(req.body.existingImages);
        } catch (e) {
          updateData.images = req.body.existingImages;
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
        const uploadedImages = req.files.galleryImages.map(
          (f) => `/uploads/${f.filename}`
        );
        if (updateData.images && Array.isArray(updateData.images)) {
          updateData.images = [...updateData.images, ...uploadedImages];
        } else {
          updateData.images = uploadedImages;
        }
      }

      if (req.files?.pdf) {
        if (product.pdfUrl) {
          const oldPath = path.join(__dirname, product.pdfUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        updateData.pdfUrl = `/uploads/${req.files.pdf[0].filename}`;
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

// QUICK STOCK UPDATE (ADMIN - maintain inventory for billing & quotations)
app.put("/admin/product/:id/stock", verifyAdmin, async (req, res) => {
  try {
    const { stock, delta } = req.body;
    let update = {};
    if (stock !== undefined) {
      update.stock = Math.max(0, Number(stock));
    } else if (delta !== undefined) {
      update.$inc = { stock: Number(delta) };
    } else {
      return res.status(400).json({ message: "Stock value or delta required" });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Stock updated successfully", product });
  } catch (err) {
    console.error("Stock update error:", err);
    res.status(500).json({ message: "Failed to update stock" });
  }
});

/* ============================================================================
   ADMIN QUOTATION MANAGEMENT (Module 5: Quotation Management)
   - Create quotations manually or using saved products
   - Edit product prices, quantities, and discounts
   - Save and preview quotations
   - Download quotations as A4-size PDF files
   - Convert approved quotations into invoices
============================================================================ */

// GET NEXT QUOTATION NUMBER
app.get("/admin/quotations/next-number", verifyAdmin, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const count = await Quotation.countDocuments();
    const padded = String(count + 1).padStart(4, "0");
    const nextNumber = `QT-${year}-${padded}`;
    res.json({ nextNumber });
  } catch (err) {
    console.error("Failed to generate next quotation number:", err);
    res.status(500).json({ message: "Failed to generate quotation number" });
  }
});

// CREATE QUOTATION (ADMIN)
app.post("/admin/quotations", verifyAdmin, async (req, res) => {
  try {
    const { quotationNumber, docNumber, customerName, items, grandTotal } = req.body;
    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({ message: "Customer name and at least one item are required" });
    }

    // Auto-generate quotation number if missing
    let qNum = quotationNumber || docNumber;
    if (!qNum || qNum.trim() === "") {
      const year = new Date().getFullYear();
      const count = await Quotation.countDocuments();
      const padded = String(count + 1).padStart(4, "0");
      qNum = `QT-${year}-${padded}`;
    }

    const quotation = await Quotation.create({
      ...req.body,
      quotationNumber: qNum,
      docNumber: qNum,
      status: req.body.status || "Pending"
    });
    res.status(201).json(quotation);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "A quotation with this number already exists. Please use a unique number." });
    }
    console.error("Failed to create quotation:", err);
    res.status(500).json({ message: "Failed to create quotation", error: err.message });
  }
});

// GET ALL QUOTATIONS WITH METRICS (ADMIN)
app.get("/admin/quotations", verifyAdmin, async (req, res) => {
  try {
    const { search, status, sort } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    let docs = await Quotation.find(filter).sort({ createdAt: -1 }).lean();

    // Search filter
    if (search && search.trim() !== "") {
      const q = search.trim().toLowerCase();
      docs = docs.filter(doc => {
        const qNum = doc.quotationNumber || doc.docNumber || "";
        return (
          qNum.toLowerCase().includes(q) ||
          (doc.customerName && doc.customerName.toLowerCase().includes(q)) ||
          (doc.customerEmail && doc.customerEmail.toLowerCase().includes(q)) ||
          (doc.customerPhone && doc.customerPhone.includes(q)) ||
          (doc.customerCompany && doc.customerCompany.toLowerCase().includes(q)) ||
          (doc.items && doc.items.some(i => i.name && i.name.toLowerCase().includes(q)))
        );
      });
    }

    // Sorting
    if (sort === "oldest") {
      docs.sort((a, b) => new Date(a.quotationDate || a.createdAt) - new Date(b.quotationDate || b.createdAt));
    } else if (sort === "amount_high") {
      docs.sort((a, b) => (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0));
    } else if (sort === "amount_low") {
      docs.sort((a, b) => (Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0));
    } else if (sort === "customer_asc") {
      docs.sort((a, b) => (a.customerName || "").localeCompare(b.customerName || ""));
    } else if (sort === "validUntil") {
      docs.sort((a, b) => {
        if (!a.validUntil) return 1;
        if (!b.validUntil) return -1;
        return new Date(a.validUntil) - new Date(b.validUntil);
      });
    } else {
      // Default: newest first
      docs.sort((a, b) => new Date(b.quotationDate || b.createdAt) - new Date(a.quotationDate || a.createdAt));
    }

    // Compute KPI metrics
    let totalValue = 0;
    let approvedValue = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let convertedCount = 0;
    let draftCount = 0;

    docs.forEach(doc => {
      const val = Number(doc.grandTotal) || 0;
      totalValue += val;
      const st = doc.status || "Pending";
      if (st === "Approved") {
        approvedCount++;
        approvedValue += val;
      } else if (st === "Converted to Invoice") {
        convertedCount++;
      } else if (st === "Draft") {
        draftCount++;
      } else {
        pendingCount++;
      }
    });

    res.json({
      quotations: docs,
      stats: {
        totalCount: docs.length,
        totalValue: Math.round(totalValue),
        approvedCount,
        approvedValue: Math.round(approvedValue),
        pendingCount,
        convertedCount,
        draftCount
      }
    });
  } catch (err) {
    console.error("Failed to fetch quotations:", err);
    res.status(500).json({ message: "Failed to fetch quotations", error: err.message });
  }
});

// GET SINGLE QUOTATION (ADMIN)
app.get("/admin/quotations/:id", verifyAdmin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json(quotation);
  } catch (err) {
    console.error("Failed to fetch quotation:", err);
    res.status(500).json({ message: "Failed to fetch quotation" });
  }
});

// UPDATE QUOTATION (ADMIN: EDIT PRICES, QUANTITIES, DISCOUNTS, DETAILS)
app.put("/admin/quotations/:id", verifyAdmin, async (req, res) => {
  try {
    const updated = await Quotation.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Quotation not found" });
    res.json(updated);
  } catch (err) {
    console.error("Failed to update quotation:", err);
    res.status(500).json({ message: "Failed to update quotation", error: err.message });
  }
});

// UPDATE QUOTATION STATUS ONLY (ADMIN)
app.put("/admin/quotations/:id/status", verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ message: `Quotation status updated to ${status}`, quotation });
  } catch (err) {
    console.error("Failed to update quotation status:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// CONVERT QUOTATION TO INVOICE (ADMIN FEATURE)
app.post("/admin/quotations/:id/convert-to-invoice", verifyAdmin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    // Generate unique Invoice Number
    const year = new Date().getFullYear();
    const invCount = await Invoice.countDocuments();
    const padded = String(invCount + 1).padStart(4, "0");
    const nextInvoiceNum = req.body.invoiceNumber || `INV-${year}-${padded}`;

    const grandTotal = Number(quotation.grandTotal) || 0;
    const paymentStatus = req.body.paymentStatus || "Pending";
    const amountPaid = paymentStatus === "Paid" ? grandTotal : (Number(req.body.amountPaid) || 0);
    const balanceAmount = Math.max(0, grandTotal - amountPaid);

    // Create Invoice from Quotation Data
    const newInvoice = await Invoice.create({
      invoiceNumber: nextInvoiceNum,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days
      customerId: quotation.customerId || "",
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail || "",
      customerPhone: quotation.customerPhone || "",
      customerCompany: quotation.customerCompany || "",
      customerAddress: quotation.customerAddress || "",
      customerGstin: quotation.customerGstin || "",
      placeOfSupply: quotation.placeOfSupply || "Tamil Nadu (33)",
      paymentMode: req.body.paymentMode || "Bank Transfer",
      paymentStatus: paymentStatus,
      amountPaid: amountPaid,
      balanceAmount: balanceAmount,
      items: quotation.items || [],
      grossSubtotal: quotation.grossSubtotal || quotation.subtotal || grandTotal,
      totalDiscount: quotation.totalDiscount || 0,
      invoiceDiscountPercent: quotation.quotationDiscountPercent || 0,
      invoiceDiscountAmount: quotation.quotationDiscountAmount || 0,
      taxableSubtotal: quotation.taxableSubtotal || quotation.subtotal || grandTotal,
      totalTax: quotation.totalTax || quotation.taxAmount || 0,
      isInterState: quotation.isInterState || false,
      cgstTotal: quotation.cgstTotal || 0,
      sgstTotal: quotation.sgstTotal || 0,
      igstTotal: quotation.igstTotal || 0,
      shippingCharges: quotation.shippingCharges || 0,
      roundOff: quotation.roundOff || 0,
      grandTotal: grandTotal,
      notes: `Converted from Quotation #${quotation.quotationNumber || quotation.docNumber}.\n${quotation.notes || ""}`,
      bankDetails: quotation.bankDetails || {
        bankName: "State Bank of India",
        accountNumber: "38920192837",
        ifscCode: "SBIN0001234",
        branch: "Coimbatore Main Branch",
        upiId: "etosm@sbi"
      }
    });

    // Mark Quotation as Converted
    quotation.status = "Converted to Invoice";
    quotation.convertedInvoiceId = String(newInvoice._id);
    quotation.convertedInvoiceNumber = newInvoice.invoiceNumber;
    quotation.convertedAt = new Date();
    await quotation.save();

    res.json({
      message: `Quotation ${quotation.quotationNumber || quotation.docNumber} successfully converted to Invoice ${newInvoice.invoiceNumber}!`,
      invoice: newInvoice,
      quotation
    });
  } catch (err) {
    console.error("Failed to convert quotation to invoice:", err);
    res.status(500).json({ message: "Failed to convert quotation to invoice", error: err.message });
  }
});

// DELETE QUOTATION (ADMIN)
app.delete("/admin/quotations/:id", verifyAdmin, async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.id);
    res.json({ message: "Quotation deleted successfully" });
  } catch (err) {
    console.error("Failed to delete quotation:", err);
    res.status(500).json({ message: "Failed to delete quotation" });
  }
});

// ============================================================================
// ADMIN INVOICE MANAGEMENT (Module 2: Create Invoice)
// ============================================================================

// GET NEXT INVOICE NUMBER
app.get("/admin/invoices/next-number", verifyAdmin, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments();
    const padded = String(count + 1).padStart(4, "0");
    const nextNumber = `INV-${year}-${padded}`;
    res.json({ nextNumber });
  } catch (err) {
    console.error("Failed to generate next invoice number:", err);
    res.status(500).json({ message: "Failed to generate invoice number" });
  }
});

// CREATE INVOICE (ADMIN)
app.post("/admin/invoices", verifyAdmin, async (req, res) => {
  try {
    const {
      invoiceNumber,
      customerName,
      items,
      grandTotal,
      deductStock
    } = req.body;

    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({ message: "Customer name and at least one item are required" });
    }

    // Auto-generate invoice number if missing
    let invNum = invoiceNumber;
    if (!invNum || invNum.trim() === "") {
      const year = new Date().getFullYear();
      const count = await Invoice.countDocuments();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      invNum = `INV-${year}-${String(count + 1).padStart(3, "0")}-${randomSuffix}`;
    }

    // Optional stock deduction
    if (deductStock === true && Array.isArray(items)) {
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        if (item.productRef && mongoose.Types.ObjectId.isValid(item.productRef)) {
          await Product.findByIdAndUpdate(item.productRef, {
            $inc: { stock: -qty }
          });
        } else if (item.productId) {
          await Product.findOneAndUpdate(
            { productId: item.productId },
            { $inc: { stock: -qty } }
          );
        }
      }
    }

    const gTotal = Number(grandTotal) || 0;
    let initialPaid = 0;
    let initialStatus = req.body.paymentStatus || "Paid";

    if (req.body.amountPaid !== undefined && req.body.amountPaid !== null && req.body.amountPaid !== "") {
      initialPaid = Number(req.body.amountPaid) || 0;
    } else if (initialStatus === "Paid") {
      initialPaid = gTotal;
    } else if (initialStatus === "Pending") {
      initialPaid = 0;
    }

    const initialBalance = Math.max(0, gTotal - initialPaid);
    if (initialPaid >= gTotal && gTotal > 0) {
      initialStatus = "Paid";
    } else if (initialPaid > 0 && initialPaid < gTotal) {
      initialStatus = "Partially Paid";
    }

    const initialHistory = [];
    if (initialPaid > 0) {
      initialHistory.push({
        amount: initialPaid,
        paymentDate: new Date(),
        paymentMode: req.body.paymentMode || "Bank Transfer",
        reference: req.body.paymentReference || "Initial Payment at Creation",
        notes: initialStatus === "Paid" ? "Paid in full at creation." : "Initial partial deposit.",
        recordedBy: "Admin"
      });
    }

    const newInvoice = await Invoice.create({
      ...req.body,
      invoiceNumber: invNum,
      paymentStatus: initialStatus,
      amountPaid: initialPaid,
      balanceAmount: initialBalance,
      paymentHistory: initialHistory
    });

    res.status(201).json(newInvoice);
  } catch (err) {
    console.error("Failed to create invoice:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Invoice number already exists. Please use a unique number." });
    }
    res.status(500).json({ message: "Failed to create invoice", error: err.message });
  }
});

// GET ALL INVOICES (ADMIN)
app.get("/admin/invoices", verifyAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.paymentStatus = status;
    }

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { invoiceNumber: regex },
        { customerName: regex },
        { customerEmail: regex },
        { customerPhone: regex },
        { customerCompany: regex }
      ];
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    console.error("Failed to fetch invoices:", err);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

// GET SINGLE INVOICE (ADMIN)
app.get("/admin/invoices/:id", verifyAdmin, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    console.error("Failed to fetch invoice:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

// UPDATE INVOICE / STATUS (ADMIN)
app.put("/admin/invoices/:id", verifyAdmin, async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    res.json(updated);
  } catch (err) {
    console.error("Failed to update invoice:", err);
    res.status(500).json({ message: "Failed to update invoice" });
  }
});

// DELETE INVOICE (ADMIN)
app.delete("/admin/invoices/:id", verifyAdmin, async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("Failed to delete invoice:", err);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});

// GET ALL PAID INVOICES WITH KPIS (ADMIN MODULE 3: Paid Invoices)
app.get("/admin/invoices/paid", verifyAdmin, async (req, res) => {
  try {
    const { search, paymentMode, dateFilter, startDate, endDate, sort } = req.query;

    // 1. Fetch from Invoice collection where paymentStatus is "Paid"
    const invQuery = { paymentStatus: "Paid" };
    const paidInvoices = await Invoice.find(invQuery).sort({ invoiceDate: -1, createdAt: -1 }).lean();

    // 2. Fetch completed/paid orders from Order collection to provide a unified financial view
    const ordersQuery = { status: { $nin: ["Cancelled", "Refunded"] } };
    const paidOrders = await Order.find(ordersQuery).sort({ createdAt: -1 }).lean();

    // Convert paid orders that don't collide with existing invoiceNumbers into standardized invoice format
    const existingInvNumbers = new Set(paidInvoices.map(i => i.invoiceNumber));

    const convertedOrders = paidOrders
      .filter(o => {
        const invNum = o.invoiceNumber || `INV-${o._id.toString().slice(-6).toUpperCase()}`;
        return !existingInvNumbers.has(invNum);
      })
      .map(o => {
        const invNum = o.invoiceNumber || `INV-${o._id.toString().slice(-6).toUpperCase()}`;
        const unitPrice = Number(o.price) || 0;
        const qty = Number(o.quantity) || 1;
        const total = Number(o.totalAmount) || unitPrice * qty;
        const tax = Number(o.tax) || Number(((total * 18) / 118).toFixed(2));
        const taxable = Number((total - tax).toFixed(2));

        let custName = o.userName || "Customer";
        let custPhone = o.phone || "";
        let custEmail = o.userEmail || "";
        let custAddr = "";

        if (o.shippingAddress) {
          if (typeof o.shippingAddress === "object") {
            custName = `${o.shippingAddress.firstName || ""} ${o.shippingAddress.lastName || ""}`.trim() || custName;
            custPhone = o.shippingAddress.phone || custPhone;
            custEmail = o.shippingAddress.email || custEmail;
            custAddr = `${o.shippingAddress.address || ""}, ${o.shippingAddress.city || ""}, ${o.shippingAddress.state || ""} ${o.shippingAddress.zipCode || ""}`.trim();
          } else {
            custAddr = String(o.shippingAddress);
          }
        }

        let payMode = "UPI / Online";
        if (o.paymentMethod === "gpay") payMode = "UPI / GPay";
        else if (o.paymentMethod === "razorpay") payMode = "Razorpay";
        else if (o.paymentMethod === "cod") payMode = "Cash on Delivery";
        else if (o.paymentMethod) payMode = o.paymentMethod.toUpperCase();

        return {
          _id: o._id,
          isFromOrder: true,
          invoiceNumber: invNum,
          invoiceDate: o.createdAt || new Date(),
          dueDate: o.createdAt || new Date(),
          customerName: custName,
          customerEmail: custEmail,
          customerPhone: custPhone,
          customerCompany: "",
          customerAddress: custAddr,
          customerGstin: "",
          placeOfSupply: "33 - Tamil Nadu",
          paymentMode: payMode,
          paymentStatus: "Paid",
          items: [
            {
              productId: o.productId || "PRD-ONLINE",
              name: o.productName || "Product Item",
              description: o.variation ? `Variation: ${o.variation}` : "",
              quantity: qty,
              unitPrice: Number((taxable / qty).toFixed(2)),
              discountPercent: 0,
              discountAmount: 0,
              taxableAmount: taxable,
              gstPercent: 18,
              cgstAmount: Number((tax / 2).toFixed(2)),
              sgstAmount: Number((tax / 2).toFixed(2)),
              igstAmount: 0,
              totalAmount: total
            }
          ],
          grossSubtotal: taxable,
          totalDiscount: 0,
          taxableSubtotal: taxable,
          totalTax: tax,
          isInterState: false,
          cgstTotal: Number((tax / 2).toFixed(2)),
          sgstTotal: Number((tax / 2).toFixed(2)),
          igstTotal: 0,
          shippingCharges: Number(o.shippingCost) || 0,
          roundOff: 0,
          grandTotal: Math.round(total),
          notes: "Auto-synced from verified customer order transaction.",
          bankDetails: {
            bankName: "State Bank of India",
            accountNumber: "38920192837",
            ifscCode: "SBIN0001234",
            branch: "Coimbatore Main Branch",
            upiId: "etosm@sbi"
          },
          createdAt: o.createdAt || new Date()
        };
      });

    // Merge and compute unified list
    let allPaid = [...paidInvoices, ...convertedOrders];

    // Filter by search query
    if (search && search.trim() !== "") {
      const q = search.trim().toLowerCase();
      allPaid = allPaid.filter(inv =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerEmail && inv.customerEmail.toLowerCase().includes(q)) ||
        (inv.customerPhone && inv.customerPhone.includes(q)) ||
        (inv.customerCompany && inv.customerCompany.toLowerCase().includes(q)) ||
        (inv.items && inv.items.some(i => i.name && i.name.toLowerCase().includes(q)))
      );
    }

    // Filter by paymentMode
    if (paymentMode && paymentMode !== "all") {
      allPaid = allPaid.filter(inv => {
        const pm = (inv.paymentMode || "").toLowerCase();
        return pm.includes(paymentMode.toLowerCase());
      });
    }

    // Filter by date
    const now = new Date();
    if (dateFilter === "today") {
      const todayStr = now.toISOString().split("T")[0];
      allPaid = allPaid.filter(inv => {
        const invDate = new Date(inv.invoiceDate || inv.createdAt).toISOString().split("T")[0];
        return invDate === todayStr;
      });
    } else if (dateFilter === "this_week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      allPaid = allPaid.filter(inv => new Date(inv.invoiceDate || inv.createdAt) >= oneWeekAgo);
    } else if (dateFilter === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      allPaid = allPaid.filter(inv => new Date(inv.invoiceDate || inv.createdAt) >= startOfMonth);
    } else if (dateFilter === "custom" && startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      allPaid = allPaid.filter(inv => {
        const d = new Date(inv.invoiceDate || inv.createdAt);
        return d >= s && d <= e;
      });
    }

    // Sorting
    if (sort === "oldest") {
      allPaid.sort((a, b) => new Date(a.invoiceDate || a.createdAt) - new Date(b.invoiceDate || b.createdAt));
    } else if (sort === "amount_high") {
      allPaid.sort((a, b) => (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0));
    } else if (sort === "amount_low") {
      allPaid.sort((a, b) => (Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0));
    } else if (sort === "customer_asc") {
      allPaid.sort((a, b) => (a.customerName || "").localeCompare(b.customerName || ""));
    } else {
      // Default: newest first
      allPaid.sort((a, b) => new Date(b.invoiceDate || b.createdAt) - new Date(a.invoiceDate || a.createdAt));
    }

    // Compute Overall Statistics
    const totalCount = allPaid.length;
    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let thisMonthRevenue = 0;
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    allPaid.forEach(inv => {
      const amt = Number(inv.grandTotal) || 0;
      totalRevenue += amt;
      totalTaxCollected += Number(inv.totalTax) || 0;
      const d = new Date(inv.invoiceDate || inv.createdAt);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        thisMonthRevenue += amt;
      }
    });

    const averageValue = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

    res.json({
      invoices: allPaid,
      stats: {
        totalCount,
        totalRevenue: Math.round(totalRevenue),
        totalTaxCollected: Math.round(totalTaxCollected),
        thisMonthRevenue: Math.round(thisMonthRevenue),
        averageValue
      }
    });
  } catch (err) {
    console.error("Failed to fetch paid invoices:", err);
    res.status(500).json({ message: "Failed to fetch paid invoices", error: err.message });
  }
});

// ============================================================================
// ADMIN PENDING INVOICES MANAGEMENT (Module 4: Pending Invoices)
// Track unpaid and partially paid invoices, total invoice amount, amount paid,
// and outstanding balance, view & manage payment status.
// ============================================================================

// GET ALL PENDING & PARTIALLY PAID INVOICES WITH AR KPIS (ADMIN MODULE 4)
app.get("/admin/invoices/pending", verifyAdmin, async (req, res) => {
  try {
    const { search, status, dateFilter, startDate, endDate, sort } = req.query;

    // 1. Fetch from Invoice collection where paymentStatus is Pending, Partially Paid, or Unpaid
    const invQuery = {
      paymentStatus: { $in: ["Pending", "Partially Paid", "Unpaid"] }
    };

    let rawInvoices = await Invoice.find(invQuery).sort({ dueDate: 1, createdAt: -1 }).lean();

    // 2. Normalize calculations for every invoice (amountPaid, balanceAmount, isOverdue)
    const now = new Date();
    let normalizedInvoices = rawInvoices.map(inv => {
      const grandTotal = Number(inv.grandTotal) || 0;
      let amountPaid = Number(inv.amountPaid) || 0;
      
      // If paymentStatus was marked Paid somehow, amountPaid = grandTotal
      if (inv.paymentStatus === "Paid") {
        amountPaid = grandTotal;
      }
      
      let balanceAmount = inv.balanceAmount !== undefined && inv.balanceAmount !== null && inv.balanceAmount !== ""
        ? Number(inv.balanceAmount)
        : Math.max(0, grandTotal - amountPaid);

      // Check if overdue
      let isOverdue = false;
      let daysOverdue = 0;
      if (inv.dueDate && balanceAmount > 0) {
        const due = new Date(inv.dueDate);
        if (due < now) {
          isOverdue = true;
          daysOverdue = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
        }
      }

      return {
        ...inv,
        grandTotal,
        amountPaid,
        balanceAmount,
        isOverdue,
        daysOverdue
      };
    });

    // 3. Status filter
    if (status && status !== "all") {
      if (status === "overdue") {
        normalizedInvoices = normalizedInvoices.filter(inv => inv.isOverdue);
      } else if (status === "Pending") {
        normalizedInvoices = normalizedInvoices.filter(inv => inv.paymentStatus === "Pending" || inv.paymentStatus === "Unpaid");
      } else if (status === "Partially Paid") {
        normalizedInvoices = normalizedInvoices.filter(inv => inv.paymentStatus === "Partially Paid");
      }
    }

    // 4. Search Filter
    if (search && search.trim() !== "") {
      const q = search.trim().toLowerCase();
      normalizedInvoices = normalizedInvoices.filter(inv =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerEmail && inv.customerEmail.toLowerCase().includes(q)) ||
        (inv.customerPhone && inv.customerPhone.includes(q)) ||
        (inv.customerCompany && inv.customerCompany.toLowerCase().includes(q)) ||
        (inv.items && inv.items.some(i => i.name && i.name.toLowerCase().includes(q)))
      );
    }

    // 5. Date Filter (by Due Date or Invoice Date)
    if (dateFilter === "today") {
      const todayStr = now.toISOString().split("T")[0];
      normalizedInvoices = normalizedInvoices.filter(inv => {
        const d = new Date(inv.dueDate || inv.invoiceDate || inv.createdAt).toISOString().split("T")[0];
        return d === todayStr;
      });
    } else if (dateFilter === "this_week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      normalizedInvoices = normalizedInvoices.filter(inv => new Date(inv.dueDate || inv.invoiceDate || inv.createdAt) >= oneWeekAgo);
    } else if (dateFilter === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      normalizedInvoices = normalizedInvoices.filter(inv => new Date(inv.dueDate || inv.invoiceDate || inv.createdAt) >= startOfMonth);
    } else if (dateFilter === "overdue") {
      normalizedInvoices = normalizedInvoices.filter(inv => inv.isOverdue);
    } else if (dateFilter === "custom" && startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      normalizedInvoices = normalizedInvoices.filter(inv => {
        const d = new Date(inv.dueDate || inv.invoiceDate || inv.createdAt);
        return d >= s && d <= e;
      });
    }

    // 6. Sorting
    if (sort === "dueDate_asc") {
      // Overdue & earliest due date first
      normalizedInvoices.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    } else if (sort === "balance_high") {
      normalizedInvoices.sort((a, b) => b.balanceAmount - a.balanceAmount);
    } else if (sort === "balance_low") {
      normalizedInvoices.sort((a, b) => a.balanceAmount - b.balanceAmount);
    } else if (sort === "amount_high") {
      normalizedInvoices.sort((a, b) => b.grandTotal - a.grandTotal);
    } else if (sort === "oldest") {
      normalizedInvoices.sort((a, b) => new Date(a.invoiceDate || a.createdAt) - new Date(b.invoiceDate || b.createdAt));
    } else if (sort === "customer_asc") {
      normalizedInvoices.sort((a, b) => (a.customerName || "").localeCompare(b.customerName || ""));
    } else {
      // Default newest
      normalizedInvoices.sort((a, b) => new Date(b.invoiceDate || b.createdAt) - new Date(a.invoiceDate || a.createdAt));
    }

    // 7. Compute Key Performance Indicators (KPIs)
    let totalInvoiceAmount = 0;
    let totalAmountPaid = 0;
    let totalOutstandingBalance = 0;
    let unpaidCount = 0;
    let partiallyPaidCount = 0;
    let overdueCount = 0;
    let totalOverdueAmount = 0;

    normalizedInvoices.forEach(inv => {
      totalInvoiceAmount += inv.grandTotal;
      totalAmountPaid += inv.amountPaid;
      totalOutstandingBalance += inv.balanceAmount;

      if (inv.paymentStatus === "Partially Paid") {
        partiallyPaidCount++;
      } else {
        unpaidCount++;
      }

      if (inv.isOverdue) {
        overdueCount++;
        totalOverdueAmount += inv.balanceAmount;
      }
    });

    res.json({
      invoices: normalizedInvoices,
      stats: {
        totalPendingCount: normalizedInvoices.length,
        unpaidCount,
        partiallyPaidCount,
        overdueCount,
        totalInvoiceAmount: Math.round(totalInvoiceAmount),
        totalAmountPaid: Math.round(totalAmountPaid),
        totalOutstandingBalance: Math.round(totalOutstandingBalance),
        totalOverdueAmount: Math.round(totalOverdueAmount)
      }
    });
  } catch (err) {
    console.error("Failed to fetch pending invoices:", err);
    res.status(500).json({ message: "Failed to fetch pending invoices", error: err.message });
  }
});

// RECORD PAYMENT / MANAGE PAYMENT STATUS (ADMIN MODULE 4)
app.post("/admin/invoices/:id/record-payment", verifyAdmin, async (req, res) => {
  try {
    const {
      amount,
      paymentMode,
      reference,
      paymentDate,
      notes,
      action, // "record_payment", "mark_paid", "mark_pending", "mark_cancelled"
      targetStatus
    } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const grandTotal = Number(invoice.grandTotal) || 0;
    let currentPaid = Number(invoice.amountPaid) || 0;

    if (action === "mark_paid" || targetStatus === "Paid") {
      const remaining = Math.max(0, grandTotal - currentPaid);
      invoice.amountPaid = grandTotal;
      invoice.balanceAmount = 0;
      invoice.paymentStatus = "Paid";
      invoice.lastPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
      if (paymentMode) invoice.paymentMode = paymentMode;
      if (reference) invoice.paymentReference = reference;
      if (notes) invoice.paymentNotes = notes;

      if (!Array.isArray(invoice.paymentHistory)) invoice.paymentHistory = [];
      invoice.paymentHistory.push({
        amount: remaining > 0 ? remaining : grandTotal,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMode: paymentMode || invoice.paymentMode || "Bank Transfer",
        reference: reference || "Marked as Paid in Full",
        notes: notes || "Full balance cleared by Admin.",
        recordedBy: "Admin"
      });
    } else if (action === "mark_pending" || targetStatus === "Pending") {
      invoice.amountPaid = 0;
      invoice.balanceAmount = grandTotal;
      invoice.paymentStatus = "Pending";
      if (notes) invoice.paymentNotes = notes;
    } else if (action === "mark_cancelled" || targetStatus === "Cancelled") {
      invoice.paymentStatus = "Cancelled";
      if (notes) invoice.paymentNotes = notes;
    } else {
      // Record payment transaction (Partial or Full)
      const payAmt = Number(amount) || 0;
      if (payAmt <= 0) {
        return res.status(400).json({ message: "Please enter a valid payment amount greater than 0" });
      }

      const newAmountPaid = currentPaid + payAmt;
      const newBalance = Math.max(0, grandTotal - newAmountPaid);

      invoice.amountPaid = newAmountPaid;
      invoice.balanceAmount = newBalance;
      invoice.lastPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
      if (paymentMode) invoice.paymentMode = paymentMode;
      if (reference) invoice.paymentReference = reference;
      if (notes) invoice.paymentNotes = notes;

      if (newBalance === 0 || newAmountPaid >= grandTotal) {
        invoice.paymentStatus = "Paid";
      } else {
        invoice.paymentStatus = "Partially Paid";
      }

      if (!Array.isArray(invoice.paymentHistory)) invoice.paymentHistory = [];
      invoice.paymentHistory.push({
        amount: payAmt,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMode: paymentMode || "Bank Transfer",
        reference: reference || "",
        notes: notes || "",
        recordedBy: "Admin"
      });
    }

    await invoice.save();
    res.json({ message: "Payment updated successfully", invoice });
  } catch (err) {
    console.error("Failed to record payment:", err);
    res.status(500).json({ message: "Failed to record payment", error: err.message });
  }
});

// ============================================================================
// ADMIN BILLING REPORTS (Module 7: Billing Reports)
// - View total sales and paid amounts
// - Track pending payment balances
// - Generate date-wise invoice reports
// - Review billing transactions and payment summaries
// ============================================================================
app.get("/admin/billing-reports", verifyAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      dateFilter = "this_month",
      paymentStatus = "all",
      paymentMode = "all",
      search = ""
    } = req.query;

    const now = new Date();
    let queryStartDate = null;
    let queryEndDate = null;

    if (dateFilter === "today") {
      queryStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      queryEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      queryStartDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      queryEndDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === "this_week") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      queryStartDate = new Date(d.setDate(diff));
      queryStartDate.setHours(0, 0, 0, 0);
      queryEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === "this_month") {
      queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      queryEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilter === "last_month") {
      queryStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      queryEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (dateFilter === "this_quarter") {
      const quarter = Math.floor(now.getMonth() / 3);
      queryStartDate = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
      queryEndDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
    } else if (dateFilter === "this_year") {
      queryStartDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      queryEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (dateFilter === "custom" && startDate && endDate) {
      queryStartDate = new Date(startDate);
      queryStartDate.setHours(0, 0, 0, 0);
      queryEndDate = new Date(endDate);
      queryEndDate.setHours(23, 59, 59, 999);
    }

    const filter = {};

    if (queryStartDate && queryEndDate) {
      filter.$or = [
        { invoiceDate: { $gte: queryStartDate, $lte: queryEndDate } },
        { invoiceDate: { $exists: false }, createdAt: { $gte: queryStartDate, $lte: queryEndDate } }
      ];
    }

    if (paymentStatus && paymentStatus !== "all") {
      filter.paymentStatus = paymentStatus;
    }

    if (paymentMode && paymentMode !== "all") {
      filter.paymentMode = { $regex: new RegExp(paymentMode, "i") };
    }

    if (search && search.trim() !== "") {
      const sRegex = new RegExp(search.trim(), "i");
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { invoiceNumber: sRegex },
          { customerName: sRegex },
          { customerPhone: sRegex },
          { customerEmail: sRegex },
          { customerCompany: sRegex }
        ]
      });
    }

    const invoices = await Invoice.find(filter).sort({ invoiceDate: -1, createdAt: -1 }).lean();

    let totalSales = 0;
    let totalPaid = 0;
    let totalPendingBalance = 0;
    let totalTax = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let taxableAmount = 0;

    let paidCount = 0;
    let partiallyPaidCount = 0;
    let unpaidCount = 0;
    let cancelledCount = 0;

    const aging = {
      current: { count: 0, amount: 0 },
      overdue1to15: { count: 0, amount: 0 },
      overdue16to30: { count: 0, amount: 0 },
      overdue31plus: { count: 0, amount: 0 }
    };

    const modeMap = {};
    const customerMap = {};
    const dateMap = {};
    const transactions = [];

    invoices.forEach((inv) => {
      const grandTotal = Number(inv.grandTotal) || 0;
      let amountPaid = Number(inv.amountPaid) || 0;
      if (inv.paymentStatus === "Paid") {
        amountPaid = grandTotal;
      }
      const balanceAmount = inv.balanceAmount !== undefined && inv.balanceAmount !== null
        ? Number(inv.balanceAmount)
        : Math.max(0, grandTotal - amountPaid);

      const status = inv.paymentStatus || (balanceAmount === 0 ? "Paid" : amountPaid > 0 ? "Partially Paid" : "Pending");

      if (status !== "Cancelled") {
        totalSales += grandTotal;
        totalPaid += amountPaid;
        totalPendingBalance += balanceAmount;
        totalTax += Number(inv.totalTax) || 0;
        cgstTotal += Number(inv.cgstTotal) || 0;
        sgstTotal += Number(inv.sgstTotal) || 0;
        igstTotal += Number(inv.igstTotal) || 0;
        taxableAmount += Number(inv.taxableSubtotal) || 0;

        if (status === "Paid") paidCount++;
        else if (status === "Partially Paid") partiallyPaidCount++;
        else unpaidCount++;

        if (balanceAmount > 0) {
          if (inv.dueDate && new Date(inv.dueDate) < now) {
            const days = Math.ceil((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
            if (days <= 15) {
              aging.overdue1to15.count++;
              aging.overdue1to15.amount += balanceAmount;
            } else if (days <= 30) {
              aging.overdue16to30.count++;
              aging.overdue16to30.amount += balanceAmount;
            } else {
              aging.overdue31plus.count++;
              aging.overdue31plus.amount += balanceAmount;
            }
          } else {
            aging.current.count++;
            aging.current.amount += balanceAmount;
          }
        }
      } else {
        cancelledCount++;
      }

      const cKey = (inv.customerName || "Customer").trim();
      if (!customerMap[cKey]) {
        customerMap[cKey] = {
          name: cKey,
          company: inv.customerCompany || "",
          phone: inv.customerPhone || "",
          invoiceCount: 0,
          totalSales: 0,
          totalPaid: 0,
          pendingBalance: 0
        };
      }
      customerMap[cKey].invoiceCount++;
      customerMap[cKey].totalSales += grandTotal;
      customerMap[cKey].totalPaid += amountPaid;
      customerMap[cKey].pendingBalance += balanceAmount;

      const dObj = new Date(inv.invoiceDate || inv.createdAt);
      const yyyy = dObj.getFullYear();
      const mm = String(dObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dObj.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
          displayDate: dObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          invoiceCount: 0,
          totalSales: 0,
          amountPaid: 0,
          balanceAmount: 0,
          taxAmount: 0,
          invoices: []
        };
      }

      dateMap[dateKey].invoiceCount++;
      if (status !== "Cancelled") {
        dateMap[dateKey].totalSales += grandTotal;
        dateMap[dateKey].amountPaid += amountPaid;
        dateMap[dateKey].balanceAmount += balanceAmount;
        dateMap[dateKey].taxAmount += Number(inv.totalTax) || 0;
      }
      dateMap[dateKey].invoices.push({
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        customerCompany: inv.customerCompany,
        customerPhone: inv.customerPhone,
        grandTotal,
        amountPaid,
        balanceAmount,
        paymentStatus: status,
        paymentMode: inv.paymentMode || "Bank Transfer"
      });

      if (Array.isArray(inv.paymentHistory) && inv.paymentHistory.length > 0) {
        inv.paymentHistory.forEach((h, hIdx) => {
          const mode = h.paymentMode || inv.paymentMode || "Bank Transfer";
          const hAmt = Number(h.amount) || 0;

          transactions.push({
            transactionId: h._id ? h._id.toString() : `${inv.invoiceNumber}-TXN-${hIdx + 1}`,
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            customerCompany: inv.customerCompany,
            customerPhone: inv.customerPhone,
            paymentDate: h.paymentDate || inv.invoiceDate || inv.createdAt,
            amount: hAmt,
            paymentMode: mode,
            reference: h.reference || inv.paymentReference || "Payment Record",
            notes: h.notes || inv.paymentNotes || "",
            recordedBy: h.recordedBy || "Admin",
            invoiceStatus: status,
            grandTotal: grandTotal,
            balanceRemaining: balanceAmount
          });

          modeMap[mode] = (modeMap[mode] || 0) + hAmt;
        });
      } else if (amountPaid > 0) {
        const mode = inv.paymentMode || "Bank Transfer";
        transactions.push({
          transactionId: `${inv.invoiceNumber}-TXN-1`,
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          customerCompany: inv.customerCompany,
          customerPhone: inv.customerPhone,
          paymentDate: inv.lastPaymentDate || inv.invoiceDate || inv.createdAt,
          amount: amountPaid,
          paymentMode: mode,
          reference: inv.paymentReference || (status === "Paid" ? "Full Payment" : "Initial Payment"),
          notes: inv.paymentNotes || "",
          recordedBy: "Admin",
          invoiceStatus: status,
          grandTotal: grandTotal,
          balanceRemaining: balanceAmount
        });

        modeMap[mode] = (modeMap[mode] || 0) + amountPaid;
      }
    });

    const dateWiseReports = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
    transactions.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    const totalModeCollections = Object.values(modeMap).reduce((a, b) => a + b, 0);
    const paymentModeBreakdown = Object.keys(modeMap).map((mode) => ({
      mode,
      amount: modeMap[mode],
      percentage: totalModeCollections > 0 ? Number(((modeMap[mode] / totalModeCollections) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.amount - a.amount);

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    const collectionEfficiency = totalSales > 0 ? Number(((totalPaid / totalSales) * 100).toFixed(1)) : 0;

    res.json({
      dateFilter,
      startDate: queryStartDate,
      endDate: queryEndDate,
      summary: {
        totalSales: Math.round(totalSales),
        totalPaid: Math.round(totalPaid),
        totalPendingBalance: Math.round(totalPendingBalance),
        totalTax: Math.round(totalTax),
        cgstTotal: Math.round(cgstTotal),
        sgstTotal: Math.round(sgstTotal),
        igstTotal: Math.round(igstTotal),
        taxableAmount: Math.round(taxableAmount),
        collectionEfficiency,
        totalInvoicesCount: invoices.length,
        paidCount,
        partiallyPaidCount,
        unpaidCount,
        cancelledCount
      },
      agingSummary: aging,
      paymentModeBreakdown,
      dateWiseReports,
      transactions,
      topCustomers,
      invoices
    });
  } catch (err) {
    console.error("Failed to generate billing reports:", err);
    res.status(500).json({ message: "Failed to generate billing reports", error: err.message });
  }
});

// ============================================================================
// ADMIN CREDIT NOTE MANAGEMENT (Module 8: Credit Notes)
// Issue, manage, and track credit notes against invoices or direct returns.
// ============================================================================

// GET NEXT CREDIT NOTE NUMBER
app.get("/admin/credit-notes/next-number", verifyAdmin, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const count = await CreditNote.countDocuments();
    const nextNumber = `CN-${year}-${String(count + 1).padStart(4, "0")}`;
    res.json({ nextNumber });
  } catch (err) {
    console.error("Failed to generate credit note number:", err);
    res.status(500).json({ message: "Failed to generate credit note number" });
  }
});

// CREATE CREDIT NOTE (ADMIN)
app.post("/admin/credit-notes", verifyAdmin, async (req, res) => {
  try {
    const {
      creditNoteNumber,
      creditNoteDate,
      invoiceId,
      invoiceNumber,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      customerAddress,
      customerGstin,
      placeOfSupply,
      reason,
      items,
      subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      totalTax,
      totalCreditAmount,
      status,
      refundMode,
      refundReference,
      refundDate,
      notes,
      deductFromInvoiceBalance
    } = req.body;

    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({ message: "Customer name and line items are required" });
    }

    let cnNumber = creditNoteNumber;
    if (!cnNumber || cnNumber.trim() === "") {
      const year = new Date().getFullYear();
      const count = await CreditNote.countDocuments();
      cnNumber = `CN-${year}-${String(count + 1).padStart(4, "0")}`;
    }

    const creditAmount = Number(totalCreditAmount) || 0;

    const newCN = await CreditNote.create({
      creditNoteNumber: cnNumber,
      creditNoteDate: creditNoteDate ? new Date(creditNoteDate) : new Date(),
      invoiceId: invoiceId || "",
      invoiceNumber: invoiceNumber || "",
      customerId: customerId || "",
      customerName: customerName.trim(),
      customerEmail: customerEmail || "",
      customerPhone: customerPhone || "",
      customerCompany: customerCompany || "",
      customerAddress: customerAddress || "",
      customerGstin: customerGstin || "",
      placeOfSupply: placeOfSupply || "Tamil Nadu (33)",
      reason: reason || "Goods Returned",
      items: items || [],
      subtotal: Number(subtotal) || 0,
      cgstTotal: Number(cgstTotal) || 0,
      sgstTotal: Number(sgstTotal) || 0,
      igstTotal: Number(igstTotal) || 0,
      totalTax: Number(totalTax) || 0,
      totalCreditAmount: creditAmount,
      status: status || (deductFromInvoiceBalance ? "Applied to Invoice" : "Issued"),
      appliedInvoiceNumber: deductFromInvoiceBalance && invoiceNumber ? invoiceNumber : "",
      refundMode: refundMode || "Bank Transfer",
      refundReference: refundReference || "",
      refundDate: refundDate ? new Date(refundDate) : null,
      notes: notes || "",
      createdBy: "Admin"
    });

    // If requested, adjust linked invoice balance
    if (deductFromInvoiceBalance && (invoiceId || invoiceNumber)) {
      const invQuery = invoiceId ? { _id: invoiceId } : { invoiceNumber };
      const invoice = await Invoice.findOne(invQuery);
      if (invoice) {
        const curBalance = Number(invoice.balanceAmount) || Math.max(0, Number(invoice.grandTotal) - Number(invoice.amountPaid));
        const newBalance = Math.max(0, curBalance - creditAmount);
        invoice.balanceAmount = newBalance;
        if (newBalance === 0) {
          invoice.paymentStatus = "Paid";
        }
        if (!Array.isArray(invoice.paymentHistory)) invoice.paymentHistory = [];
        invoice.paymentHistory.push({
          amount: creditAmount,
          paymentDate: new Date(),
          paymentMode: "Credit Note Adjustment",
          reference: `Credit Note #${cnNumber}`,
          notes: `Credit Note of ₹${creditAmount} applied against outstanding balance. Reason: ${reason || "Adjustment"}.`,
          recordedBy: "Admin"
        });
        await invoice.save();
      }
    }

    res.status(201).json({ message: "Credit Note issued successfully", creditNote: newCN });
  } catch (err) {
    console.error("Failed to create credit note:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Credit note number already exists" });
    }
    res.status(500).json({ message: "Failed to create credit note", error: err.message });
  }
});

// GET ALL CREDIT NOTES WITH STATS (ADMIN)
app.get("/admin/credit-notes", verifyAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim() !== "") {
      const q = new RegExp(search.trim(), "i");
      filter.$or = [
        { creditNoteNumber: q },
        { invoiceNumber: q },
        { customerName: q },
        { customerPhone: q },
        { customerCompany: q }
      ];
    }

    const creditNotes = await CreditNote.find(filter).sort({ creditNoteDate: -1, createdAt: -1 }).lean();

    let totalCreditValue = 0;
    let appliedValue = 0;
    let refundedValue = 0;
    let issuedCount = 0;
    let appliedCount = 0;
    let refundedCount = 0;

    creditNotes.forEach((cn) => {
      const val = Number(cn.totalCreditAmount) || 0;
      totalCreditValue += val;
      if (cn.status === "Applied to Invoice") {
        appliedValue += val;
        appliedCount++;
      } else if (cn.status === "Refunded") {
        refundedValue += val;
        refundedCount++;
      } else {
        issuedCount++;
      }
    });

    res.json({
      creditNotes,
      stats: {
        totalCount: creditNotes.length,
        totalCreditValue: Math.round(totalCreditValue),
        appliedValue: Math.round(appliedValue),
        refundedValue: Math.round(refundedValue),
        issuedCount,
        appliedCount,
        refundedCount
      }
    });
  } catch (err) {
    console.error("Failed to fetch credit notes:", err);
    res.status(500).json({ message: "Failed to fetch credit notes", error: err.message });
  }
});

// GET SINGLE CREDIT NOTE (ADMIN)
app.get("/admin/credit-notes/:id", verifyAdmin, async (req, res) => {
  try {
    const cn = await CreditNote.findById(req.params.id);
    if (!cn) return res.status(404).json({ message: "Credit note not found" });
    res.json(cn);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch credit note" });
  }
});

// UPDATE CREDIT NOTE STATUS (ADMIN)
app.put("/admin/credit-notes/:id/status", verifyAdmin, async (req, res) => {
  try {
    const { status, refundMode, refundReference, refundDate, notes } = req.body;
    const update = { status, updatedAt: new Date() };
    if (refundMode) update.refundMode = refundMode;
    if (refundReference) update.refundReference = refundReference;
    if (refundDate) update.refundDate = new Date(refundDate);
    if (notes) update.notes = notes;

    const updated = await CreditNote.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: "Credit note not found" });

    res.json({ message: `Credit note status updated to "${status}"`, creditNote: updated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update credit note status" });
  }
});

// DELETE CREDIT NOTE (ADMIN)
app.delete("/admin/credit-notes/:id", verifyAdmin, async (req, res) => {
  try {
    await CreditNote.findByIdAndDelete(req.params.id);
    res.json({ message: "Credit note deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete credit note" });
  }
});

// ============================================================================
// ADMIN SHIPPING LABELS HELPER (Module 9: 6x4 Thermal Shipping Labels)
// Fetch recent orders & invoices as quick sources for thermal label generation.
// ============================================================================
app.get("/admin/shipping-labels/sources", verifyAdmin, async (req, res) => {
  try {
    const [orders, invoices] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).limit(100).lean(),
      Invoice.find().sort({ createdAt: -1 }).limit(100).lean()
    ]);

    const orderSources = orders.map(o => {
      let shipTo = {
        name: o.userName || "Customer",
        phone: o.phone || "",
        email: o.userEmail || "",
        address: "",
        city: "",
        state: "Tamil Nadu",
        pincode: ""
      };

      if (o.shippingAddress) {
        if (typeof o.shippingAddress === "object") {
          shipTo.name = `${o.shippingAddress.firstName || ""} ${o.shippingAddress.lastName || ""}`.trim() || shipTo.name;
          shipTo.phone = o.shippingAddress.phone || shipTo.phone;
          shipTo.email = o.shippingAddress.email || shipTo.email;
          shipTo.address = `${o.shippingAddress.address || ""} ${o.shippingAddress.apartment || ""} ${o.shippingAddress.locality || ""}`.trim();
          shipTo.city = o.shippingAddress.city || "";
          shipTo.state = o.shippingAddress.state || "Tamil Nadu";
          shipTo.pincode = o.shippingAddress.zipCode || o.shippingAddress.postalCode || "";
        } else {
          shipTo.address = String(o.shippingAddress);
        }
      }

      const isCOD = o.paymentMethod === "cod" || (o.paymentMethod || "").toLowerCase().includes("cod");
      const totalAmt = Number(o.totalAmount || o.price || 0);

      return {
        id: o._id,
        sourceType: "order",
        documentNumber: o.invoiceNumber || `ORD-${String(o._id).slice(-6).toUpperCase()}`,
        orderDate: o.createdAt,
        shipTo,
        isCOD,
        collectAmount: isCOD ? totalAmt : 0,
        carrier: o.shippingMethod || "Standard Courier",
        itemsSummary: [{ name: o.productName || "Electronics Component", sku: o.sku || "", quantity: o.quantity || 1 }]
      };
    });

    const invoiceSources = invoices.map(inv => {
      const isUnpaid = inv.paymentStatus === "Pending" || inv.paymentStatus === "Partially Paid";
      const balance = Number(inv.balanceAmount) || 0;

      return {
        id: inv._id,
        sourceType: "invoice",
        documentNumber: inv.invoiceNumber,
        orderDate: inv.invoiceDate || inv.createdAt,
        shipTo: {
          name: inv.customerName,
          company: inv.customerCompany || "",
          phone: inv.customerPhone || "",
          email: inv.customerEmail || "",
          address: inv.customerAddress || "",
          city: "",
          state: "Tamil Nadu",
          pincode: ""
        },
        isCOD: isUnpaid && balance > 0,
        collectAmount: isUnpaid ? balance : 0,
        carrier: "Standard Logistics",
        itemsSummary: (inv.items || []).map(i => ({ name: i.name, sku: i.sku || "", quantity: i.quantity || 1 }))
      };
    });

    res.json({ orders: orderSources, invoices: invoiceSources });
  } catch (err) {
    console.error("Failed to load shipping label sources:", err);
    res.status(500).json({ message: "Failed to load shipping label sources", error: err.message });
  }
});


// TOGGLE PRODUCT VISIBILITY (ADMIN)
app.put("/admin/product/:id/toggle-visibility", verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const newStatus = req.body.isVisible !== undefined ? req.body.isVisible : !(product.isVisible !== false);
    product.isVisible = newStatus;
    await product.save();

    res.json({ message: `Product visibility updated to ${newStatus ? 'ON' : 'OFF'}`, product });
  } catch (err) {
    console.error("Failed to toggle product visibility:", err);
    res.status(500).json({ message: "Failed to update product visibility" });
  }
});

// TOGGLE PRODUCT BESTSELLER STATUS (ADMIN)
app.put("/admin/product/:id/toggle-bestseller", verifyAdmin, async (req, res) => {
  try {
    let query;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      query = { $or: [{ _id: req.params.id }, { productId: req.params.id }] };
    } else {
      query = { productId: req.params.id };
    }

    const current = await Product.findOne(query);
    if (!current) return res.status(404).json({ message: "Product not found" });

    const newStatus = req.body.isBestseller !== undefined ? Boolean(req.body.isBestseller) : !current.isBestseller;
    
    const updateFields = { isBestseller: newStatus };
    if (newStatus) {
      updateFields.isVisible = true; // Ensure visible on home page when selected as bestseller
    }

    // Use updateOne to bypass unrelated schema validation issues
    await Product.updateOne({ _id: current._id }, { $set: updateFields });

    res.json({
      message: `Product ${newStatus ? "marked as Bestseller" : "removed from Bestsellers"}`,
      product: { ...current.toObject(), ...updateFields }
    });
  } catch (err) {
    console.error("Failed to toggle bestseller status:", err);
    res.status(500).json({ message: "Failed to update bestseller status", error: err.message });
  }
});

// INITIALIZE BESTSELLERS WITH CURRENT HOME PRODUCTS (ADMIN)
app.post("/admin/products/bestsellers/initialize", verifyAdmin, async (req, res) => {
  try {
    const topProducts = await Product.find({ isVisible: { $ne: false } }).limit(10);
    const ids = topProducts.map(p => p._id);
    await Product.updateMany({ _id: { $in: ids } }, { $set: { isBestseller: true } });
    const bestsellers = await Product.find({ isBestseller: true, isVisible: { $ne: false } });
    res.json({
      message: `Initialized ${ids.length} products as official bestsellers`,
      bestsellers
    });
  } catch (err) {
    console.error("Failed to initialize bestsellers:", err);
    res.status(500).json({ message: "Failed to initialize bestsellers", error: err.message });
  }
});

// GET BESTSELLER PRODUCTS (HOME PAGE CAROUSEL)
app.get("/products/bestsellers", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const bestsellers = await Product.find({ isBestseller: true });
    res.json(bestsellers);
  } catch (err) {
    console.error("Failed to fetch bestsellers:", err);
    res.status(500).json({ message: "Failed to fetch bestsellers" });
  }
});

// ONE-TIME ADMIN MIGRATION: Reset ALL products to isVisible: false
app.put("/admin/reset-all-visibility", verifyAdmin, async (req, res) => {
  try {
    const result = await Product.updateMany({}, { $set: { isVisible: false } });
    res.json({ message: `Reset ${result.modifiedCount} products to OFF (hidden)` });
  } catch (err) {
    res.status(500).json({ message: "Migration failed", error: err.message });
  }
});


/* ================= USER ================= */

// PRODUCTS (Storefront - Home Page shows active products, or search results)
app.get("/products", async (req, res) => {
  try {
    const { search } = req.query;
    let query = { isVisible: { $ne: false } };

    if (search && search.trim()) {
      const cleanTerm = search.trim();
      const skuDigits = cleanTerm.replace(/[^0-9]/g, "");
      const strippedTerm = cleanTerm.replace(/^(sku|item|code)[\s:\-_#]*/i, "").trim();
      const orConditions = [
        { name: { $regex: escapeRegex(cleanTerm), $options: "i" } },
        { productId: { $regex: escapeRegex(cleanTerm), $options: "i" } },
        { category: { $regex: escapeRegex(cleanTerm), $options: "i" } },
        { subcategory: { $regex: escapeRegex(cleanTerm), $options: "i" } },
      ];
      if (skuDigits && !isNaN(Number(skuDigits))) {
        orConditions.push({ sku: Number(skuDigits) });
      }
      if (skuDigits) {
        orConditions.push({ sku: skuDigits });
      }
      if (strippedTerm) {
        orConditions.push({ sku: strippedTerm });
        orConditions.push({ sku: { $regex: escapeRegex(strippedTerm), $options: "i" } });
      }
      query = { $or: orConditions };
    }

    const products = await Product.find(query);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// ALL PRODUCTS (Complete Catalog page - returns ALL added products, or search results)
app.get("/products/all", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim()) {
      const cleanTerm = search.trim();
      const skuDigits = cleanTerm.replace(/[^0-9]/g, "");
      const strippedTerm = cleanTerm.replace(/^(sku|item|code)[\s:\-_#]*/i, "").trim();
      const orConditions = [
        { name: { $regex: escapeRegex(cleanTerm), $options: "i" } },
        { productId: { $regex: escapeRegex(cleanTerm), $options: "i" } },
        { category: { $regex: escapeRegex(cleanTerm), $options: "i" } },
        { subcategory: { $regex: escapeRegex(cleanTerm), $options: "i" } },
      ];
      if (skuDigits && !isNaN(Number(skuDigits))) {
        orConditions.push({ sku: Number(skuDigits) });
      }
      if (skuDigits) {
        orConditions.push({ sku: skuDigits });
      }
      if (strippedTerm) {
        orConditions.push({ sku: strippedTerm });
        orConditions.push({ sku: { $regex: escapeRegex(strippedTerm), $options: "i" } });
      }
      query = { $or: orConditions };
    }

    const products = await Product.find(query);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all products" });
  }
});

app.get("/products/category/:category", async (req, res) => {
  try {
    const rawCategory = decodeURIComponent(req.params.category || "");
    const escapedCategory = escapeRegex(rawCategory.trim());

    // Match category case-insensitively.
    // isVisible only hides products from the home page – category pages show ALL products.
    const products = await Product.find({
      category: { $regex: new RegExp(`^${escapedCategory}$`, "i") }
    });

    res.json(products);
  } catch (err) {
    console.error("Error fetching category products:", err);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/products/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let query;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      query = { _id: idOrSlug };
    } else {
      query = { slug: idOrSlug };
    }
    const product = await Product.findOne(query);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ORDERS
app.post("/orders", async (req, res) => {
  try {
    const {
      productName,
      productId,
      quantity,
      userEmail,
      userName,
      invoiceNumber: providedInvoice,
      razorpayPaymentId,
      razorpayOrderId,
    } = req.body;

    let productSku = req.body.sku !== undefined && req.body.sku !== "" ? Number(req.body.sku) : null;

    // Safely check product stock if valid productId
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      const product = await Product.findById(productId);
      if (product) {
        if (product.stock < (quantity || 1)) {
          return res.status(400).json({ message: `Insufficient stock. Only ${product.stock} items left.` });
        }
        await Product.findByIdAndUpdate(productId, {
          $inc: { stock: -(quantity || 1) }
        });
        if (productSku === null && product.sku != null) {
          productSku = product.sku;
        }
      }
    }

    // Generate distinct Invoice ID (e.g. INV-849201) if not provided or if provided as razorpay pay_ id
    let invoiceNum = providedInvoice;
    if (!invoiceNum || invoiceNum.startsWith("pay_")) {
      const uniqueNum = Math.floor(100000 + Math.random() * 900000);
      invoiceNum = `INV-${uniqueNum}`;
    }

    const orderData = {
      ...req.body,
      productName: productName || "Product Item",
      productId: productId || "N/A",
      sku: productSku,
      invoiceNumber: invoiceNum,
      razorpayPaymentId: razorpayPaymentId || (providedInvoice?.startsWith("pay_") ? providedInvoice : undefined),
      razorpayOrderId: razorpayOrderId || undefined,
    };

    const order = await Order.create(orderData);
    res.json(order);
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
});

app.get("/orders/:email", async (req, res) => {
  try {
    const orders = await Order.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user orders" });
  }
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


app.get("/reviews/:productIdOrSlug", async (req, res) => {
  try {
    const { productIdOrSlug } = req.params;
    let productId = productIdOrSlug;
    if (!mongoose.Types.ObjectId.isValid(productIdOrSlug)) {
      // It's a slug, look up the product first
      const product = await Product.findOne({ slug: productIdOrSlug });
      if (product) {
        productId = product._id;
      }
    }
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

/* ================= GOOGLE REVIEWS ================= */

// GET APPROVED GOOGLE REVIEWS (Home Page)
app.get("/google-reviews", async (req, res) => {
  try {
    const reviews = await GoogleReview.find({ isApproved: true }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch Google reviews" });
  }
});

// SUBMIT PENDING GOOGLE REVIEW (User)
app.post("/google-reviews", async (req, res) => {
  try {
    const { name, role, rating, text } = req.body;
    const newReview = await GoogleReview.create({
      name,
      role: role || "Verified Customer",
      rating: Number(rating),
      text,
      isApproved: false // Requires admin approval
    });
    res.json({ message: "Review submitted for approval", review: newReview });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit Google review" });
  }
});

// GET ALL GOOGLE REVIEWS (Admin)
app.get("/admin/google-reviews", verifyAdmin, async (req, res) => {
  try {
    const reviews = await GoogleReview.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// APPROVE GOOGLE REVIEW (Admin)
app.put("/admin/google-reviews/:id/approve", verifyAdmin, async (req, res) => {
  try {
    const review = await GoogleReview.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review approved successfully", review });
  } catch (err) {
    res.status(500).json({ message: "Failed to approve review" });
  }
});

// DELETE GOOGLE REVIEW (Admin)
app.delete("/admin/google-reviews/:id", verifyAdmin, async (req, res) => {
  try {
    const review = await GoogleReview.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete review" });
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
    const { userEmail, productId, name, price, img, qty, gstPercent, stock, sku } = req.body;

    let cartItem = await Cart.findOne({ userEmail, productId });

    if (cartItem) {
      cartItem.qty += qty;
      cartItem.price = cartItem.qty * cartItem.unitPrice;
      if (stock !== undefined) cartItem.stock = stock;
      if (sku !== undefined) cartItem.sku = sku !== "" ? Number(sku) : null;
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        userEmail,
        productId,
        name,
        unitPrice: price,
        price: price * qty,
        img,
        qty,
        gstPercent: gstPercent !== undefined ? Number(gstPercent) : 18,
        stock,
        sku: sku !== undefined && sku !== "" ? Number(sku) : null
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
    await Cart.deleteMany({
      userEmail: email,
      $or: [{ productId: productId }, { _id: productId }]
    });
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
const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => console.log(`ETOSM Server running on port ${PORT}`));
