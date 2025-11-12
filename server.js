const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path"); // 1. Import the 'path' module

// --- For Seeding Dummy Data ---
const User = require('./models/User');
const Product = require('./models/Product'); // Import Product model
const bcrypt = require('bcryptjs');

const app = express();
connectDB();

// --- Seed Database with Dummy Data ---
async function seedDatabase() {
  try {
    // --- 1. Seed Users ---
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found. Seeding database with dummy data...');

      const users = [
        { username: 'consumer1', password: 'password123', role: 'consumer' },
        { 
          username: 'farmer1', 
          password: 'password123', 
          role: 'farmer', 
          aadhar: '123456789012',
          name: 'Rajesh Kumar',
          experience: '15+ years in traditional and organic farming.',
          awards: 'Recipient of the "Krishi Karman Award" for outstanding wheat production.',
          techUsed: 'Utilizes drip irrigation, solar-powered water pumps, and soil moisture sensors.' },
        { username: 'admin1', password: 'password123', role: 'admin' },
      ];

      for (const userData of users) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
        const user = new User(userData);
        await user.save();
      }

      console.log('Dummy users created successfully!');
      console.log('- consumer1 / password123');
      console.log('- farmer1 / password123');
      console.log('- admin1 / password123');
    } else {
      console.log('Users already exist, skipping user seeding.');
    }

    // --- 2. Seed Products ---
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('Seeding products...');
      // Clear all user carts to prevent inconsistencies with old product IDs
      await User.updateMany({}, { $set: { cart: [] } });
      console.log('All user carts have been cleared.');

      const farmer = await User.findOne({ username: 'farmer1' });
      if (farmer) {
        const products = [
          // Vegetables
          { name: 'Fresh Tomatoes', price: 40.00, farmer: farmer._id, image: '/assets/products/tomatoes.jpg' },
          { name: 'Organic Carrots', price: 60.00, farmer: farmer._id, image: '/assets/products/carrots.jpg' },
          { name: 'Crisp Spinach', price: 30.00, farmer: farmer._id, image: '/assets/products/spinach.jpg' },
          { name: 'New Potatoes', price: 35.00, farmer: farmer._id, image: '/assets/products/potatoes.jpg' },
          { name: 'Red Bell Pepper', price: 55.00, farmer: farmer._id, image: '/assets/products/bell-pepper.jpg' }, // Corrected filename
          { name: 'Sweet Corn', price: 25.00, farmer: farmer._id, image: '/assets/products/sweet-corn.jpg' }, // Corrected filename
          { name: 'Fresh Onions', price: 20.00, farmer: farmer._id, image: '/assets/products/onions.jpg' },
          { name: 'Green Broccoli', price: 50.00, farmer: farmer._id, image: '/assets/products/broccoli.jpg' },
          { name: 'Cauliflower', price: 45.00, farmer: farmer._id, image: '/assets/products/cauliflower.jpg' },
          { name: 'Cucumber', price: 20.00, farmer: farmer._id, image: '/assets/products/cucumber.jpg' },
          { name: 'Garlic', price: 120.00, farmer: farmer._id, image: '/assets/products/garlic.jpg' },
          { name: 'Ginger', price: 150.00, farmer: farmer._id, image: '/assets/products/ginger.jpg' },
          // Fruits
          { name: 'Royal Gala Apples', price: 150.00, farmer: farmer._id, image: '/assets/products/apples.jpg' },
          { name: 'Ripe Bananas', price: 45.00, farmer: farmer._id, image: '/assets/products/bananas.jpg' },
          { name: 'Juicy Oranges', price: 80.00, farmer: farmer._id, image: '/assets/products/oranges.jpg' },
          { name: 'Alphonso Mangoes', price: 250.00, farmer: farmer._id, image: '/assets/products/mangoes.jpg' },
          { name: 'Green Grapes', price: 70.00, farmer: farmer._id, image: '/assets/products/grapes.jpg' },
          { name: 'Kiwi', price: 180.00, farmer: farmer._id, image: '/assets/products/kiwi.jpg' },
          { name: 'Fresh Strawberries', price: 200.00, farmer: farmer._id, image: '/assets/products/strawberry.jpg' },
          { name: 'Pineapple', price: 60.00, farmer: farmer._id, image: '/assets/products/pineapple.jpg' },
        ];
        await Product.insertMany(products);
        console.log('Dummy products created!');
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

app.use(cors());
app.use(bodyParser.json());

// 2. Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/users"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/admin", require("./routes/admin"));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  seedDatabase(); // Call the seeding function on server start
});
