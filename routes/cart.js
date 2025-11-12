const express = require('express');
const User = require('../models/User');
const router = express.Router();

// @route   POST /api/cart/add
// @desc    Add an item to a user's cart
router.post('/add', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if the product is already in the cart
    const cartItemIndex = user.cart.findIndex(item => item.product.toString() === productId);

    if (cartItemIndex > -1) {
      // If it exists, update the quantity
      user.cart[cartItemIndex].quantity += quantity; // quantity can be 1 or -1

      // If quantity drops to 0 or less, remove the item from the cart
      if (user.cart[cartItemIndex].quantity <= 0) {
        user.cart.splice(cartItemIndex, 1);
      }

    } else {
      // If it's a new item, add it to the cart
      user.cart.push({ product: productId, quantity });
    }

    await user.save();

    // Convert cart to the simple format the frontend expects
    const frontendCart = user.cart.reduce((acc, item) => {
      acc[item.product.toString()] = item.quantity;
      return acc;
    }, {});

    res.json({ msg: 'Item added to cart', cart: frontendCart });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/cart/remove
// @desc    Remove an item from a user's cart
router.post('/remove', async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Filter out the item to be removed
    user.cart = user.cart.filter(item => item.product.toString() !== productId);

    await user.save();

    const frontendCart = user.cart.reduce((acc, item) => {
      acc[item.product.toString()] = item.quantity;
      return acc;
    }, {});

    res.json({ msg: 'Item removed from cart', cart: frontendCart });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;