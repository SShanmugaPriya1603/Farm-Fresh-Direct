const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User'); // We'll need this to find the farmer

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products for the consumer catalog
router.get('/', async (req, res) => {
  try {
    // We use .populate() to get the farmer's username from the User model
    const products = await Product.find().populate('farmer', 'username name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/products/farmer/:farmerId
// @desc    Get all products for a specific farmer
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.params.farmerId });
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/products
// @desc    Add a new product (for farmers)
router.post('/', async (req, res) => {
  try {
    const { name, price, image, farmerId } = req.body;

    // In a real app, farmerId would come from a protected route's token.
    // For now, we'll trust the client to send it.
    const newProduct = new Product({
      name,
      price,
      image: image || '/assets/products/placeholder.png', // Default placeholder
      farmer: farmerId
    });

    const product = await newProduct.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
router.put('/:id', async (req, res) => {
  try {
    const { name, price, image, farmerId } = req.body;
    let product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ msg: 'Product not found' });

    // Security Check: Ensure the user updating the product is the one who created it
    if (product.farmer.toString() !== farmerId) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    product.name = name;
    product.price = price;
    product.image = image;
    
    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
router.delete('/:id', async (req, res) => {
  try {
    const { farmerId } = req.body; // Sent from frontend for verification
    let product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ msg: 'Product not found' });

    if (product.farmer.toString() !== farmerId) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Product removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;