const mongoose = require("mongoose");
require("dotenv").config();

const productSchema = new mongoose.Schema({
    name: String,
    category: String,
    price: Number,
    description: String,
    image: String,
    images: [String],
    discountPercent: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    tag: String,
    features: [String],
    discountStart: Date,
    discountEnd: Date
});

const Product = mongoose.model("Product", productSchema);

const products = [
    {
        name: "Yoga Socks",
        category: "Yoga Socks",
        price: 799,
        description: "Stay grounded and confident in every move with High Grip Yoga Socks — designed for traction, comfort, and breathability.<br><br><b>Ideal For:</b><br>• Yoga & Pilates<br>• Barre & Reformer<br>• Strength Training<br>• Senior Stability<br>• Indoor Everyday Use<br><br><b>Train Stronger. Move Safer. Feel Better.</b>",
        image: "/uploads/sock1.jpg",
        images: ["/uploads/sock1.jpg"],
        features: [
            "No Slide – Flexible fit that supports movement",
            "No Slip – Anti-skid soles for superior stability",
            "No Sweat – Breathable fabric keeps feet cool and dry"
        ],
        tag: "Trending"
    },
    {
        name: "Compression Sleeves",
        category: "Compression Sleeves",
        price: 799,
        description: "Stay energized with Etosm Compression Sleeves for arms and legs — offering all-day comfort and graduated compression to boost circulation, reduce fatigue, and speed up recovery.<br><br><b>Move Freely. Recover Faster. Perform Stronger.</b>",
        image: "/uploads/compression_sleeves_new.jpg",
        images: ["/uploads/compression_sleeves_new.jpg"],
        features: [
            "Unisex & one-size flexible fit",
            "Lightweight & breathable fabric",
            "Enhances performance, reduces soreness",
            "Perfect for sports, travel, and daily wear"
        ],
        tag: "Best Seller"
    },
    {
        name: "Thigh High Socks",
        category: "Thigh High Socks",
        price: 799,
        description: "Step into warmth and sophistication with our ultra-soft, over-the-knee socks — designed for extended coverage and effortless style.<br><br><b>Wrap yourself in style. Stay cozy all day.</b>",
        image: "/uploads/thigh_high_socks_full.jpg",
        images: ["/uploads/thigh_high_socks_full.jpg"],
        features: [
            "Luxurious comfort & stretch",
            "Stylish with boots, skirts, or dresses",
            "Available in classic, wool, and patterned designs"
        ],
        tag: "New"
    },
    {
        name: "Medical Stockings",
        category: "Medical Stockings",
        price: 799,
        description: "Support your legs with stockings designed to improve circulation, reduce swelling, and ease discomfort from varicose veins or recovery.<br><br><b>Available in various compression levels and styles.</b>",
        image: "/uploads/sock5.jpg",
        images: ["/uploads/sock5.jpg"],
        features: [
            "Graduated compression for targeted support",
            "Minimizes fatigue and swelling",
            "Discreet, breathable, and ideal for daily use"
        ],
        tag: "Professional"
    },
    {
        name: "Trampoline Socks",
        category: "Trampoline Socks",
        price: 799,
        description: "Stay grounded mid-air with Etosm Trampoline Socks—designed with ultra-grip soles for superior traction and stability.<br><br><b>Customization Available</b><br>• Branded logos<br>• Custom grip designs<br>• Color options<br><br><b>Leap with confidence. Land with Etosm.</b>",
        image: "/uploads/trampoline_socks.jpg",
        images: ["/uploads/trampoline_socks.jpg"],
        features: [
            "Secure, snug fit for active play",
            "Anti-slip soles for safer landings",
            "Breathable, sweat-wicking fabric"
        ],
        tag: "Fun"
    },
    {
        name: "Ankle Grip Socks",
        category: "Ankle Grip Socks",
        price: 799,
        discountPercent: 10,
        discountStart: new Date("2024-01-01"),
        discountEnd: new Date("2026-12-31"),
        description: "Engineered for traction, comfort, and customization, Etosm Ankle Socks are built to perform.<br><br><b>Make It Yours</b><br>Add your logo, text, or design directly on the grip. Perfect for teams, studios, or branded merchandise.<br><br><b>Move with confidence. Stand out in style — with Etosm.</b>",
        image: "/uploads/ankle_grip_socks.jpg",
        images: ["/uploads/ankle_grip_socks.jpg"],
        features: [
            "Anti-slip grip pads for stability in motion",
            "Lightweight, breathable, and all-day wearable",
            "Ideal for sports, fitness, or daily use"
        ],
        tag: "Essential"
    },
    {
        name: "Crawling Knee Pads",
        category: "Crawling Knee Pads",
        price: 799,
        description: "Support your baby's first steps and crawls with soft, breathable knee pads designed for safety and comfort. Explore safely. Grow confidently — with Etosm Baby Knee Pads.",
        image: "/uploads/knee_pads.jpg",
        images: ["/uploads/knee_pads.jpg"],
        features: [
            "Anti-slip silicone grips for secure traction",
            "Cushioned rubber cotton for gentle impact protection",
            "Breathable mesh for cool, dry skin",
            "Stretchable fit for 6-24 months",
            "Light compression that stays in place",
            "Available in soft pastels & fun colors",
            "Machine washable & quick-dry"
        ],
        tag: "Baby"
    }
];

mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("MongoDB Connected");
        try {
            // Clear existing products to avoid duplicates during this dev phase
            await Product.deleteMany({});
            console.log("Cleared existing products");

            const created = await Product.insertMany(products);
            console.log(`Created ${created.length} products`);
        } catch (err) {
            console.error(err);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch((err) => console.log(err));
