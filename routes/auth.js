const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Product = require("../models/Product");
const User = require("../models/User");

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, password, role, aadhar } = req.body;

    // Aadhaar validation (simple: must be 12 digits)
    if (role === "farmer" && (!aadhar || !/^\d{12}$/.test(aadhar))) {
      return res.status(400).json({ msg: "Invalid Aadhaar number" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      role,
      // Only set aadhar if the role is 'farmer'
      aadhar: role === "farmer" ? aadhar : undefined,
      password: hashedPassword
    });

    await user.save();

    // Create and send a token upon successful registration
    const token = jwt.sign({ id: user._id, role: user.role }, "secretKey", { expiresIn: "1h" });

    res.status(201).json({ token, role: user.role, userId: user._id, msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password, role, aadhar } = req.body;

    const query = { username, role };
    if (role === 'farmer') {
      query.aadhar = aadhar;
    }

    const user = await User.findOne(query);
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, "secretKey", { expiresIn: "1h" });

    // --- Cart Validation Logic ---
    // Get a list of all valid product IDs from the database
    const allProductIds = (await Product.find().select('_id')).map(p => p._id.toString());

    // Filter the user's cart, keeping only items that exist in the products collection
    const validCartItems = user.cart.filter(item => allProductIds.includes(item.product.toString()));

    // If the cart had invalid items, update the user in the database
    if (validCartItems.length < user.cart.length) {
      user.cart = validCartItems;
      await user.save();
      console.log(`Cleaned invalid items from cart for user: ${user.username}`);
    }
    // --- End of Cart Validation ---

    // Convert the user's DB cart into the simple { productId: quantity } format for the frontend
    const cart = validCartItems.reduce((acc, item) => {
      acc[item.product.toString()] = item.quantity;
      return acc;
    }, {});


    res.json({ token, role: user.role, userId: user._id, cart });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
