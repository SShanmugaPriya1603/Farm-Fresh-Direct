const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware to protect admin routes
const adminAuth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, 'secretKey'); // Use the same secret as in auth.js
        const user = await User.findById(decoded.id);
        if (user && user.role === 'admin') {
            req.user = user;
            next();
        } else { throw new Error(); }
    } catch (err) { res.status(401).json({ msg: 'Token is not valid' }); }
};

// @route   GET /api/users/all
// @desc    Get all users (Admin only)
router.get('/all', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password -cart').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/users/farmer-profile/:farmerId
// @desc    Get public profile and stats for a farmer
router.get('/farmer-profile/:farmerId', async (req, res) => {
  try {
    const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);

    // 1. Get public user info
    const farmer = await User.findById(farmerId).select('username name experience awards techUsed isVerified');
    if (!farmer) {
      return res.status(404).json({ msg: 'Farmer not found' });
    }

    // 2. Calculate stats using an aggregation pipeline
    const stats = await Order.aggregate([
      // Find orders that are delivered
      { $match: { status: 'Delivered' } },
      // Unwind the items array
      { $unwind: '$items' },
      // Lookup product details to find the farmer
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
      // Deconstruct the productInfo array created by the lookup
      { $unwind: '$productInfo' },
      // Filter for items belonging to the current farmer
      { $match: { 'productInfo.farmer': farmerId } },
      // Count the matching items
      { $count: 'successfullyDelivered' }
    ]);

    const deliveredCount = stats.length > 0 ? stats[0].successfullyDelivered : 0;

    res.json({
      farmer,
      stats: {
        ordersDelivered: deliveredCount
      }
    });
  } catch (err) {
    console.error('Error fetching farmer profile:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/users/:userId
// @desc    Update user profile information
router.put('/:userId', async (req, res) => {
  try {
    const { username, name, email, phone, experience, awards, techUsed } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.username = username;
    user.name = name;
    user.email = email;
    user.phone = phone;
    // Update farmer-specific fields if they exist in the request
    if (user.role === 'farmer') {
        user.experience = experience;
        user.awards = awards;
        user.techUsed = techUsed;
    }

    await user.save();
    res.json({ messageKey: 'profileUpdateSuccess' });
  } catch (err) {
    console.error(err.message);
    // Handle potential duplicate email error
    if (err.code === 11000) {
      return res.status(400).json({ messageKey: 'emailInUse' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/users/change-password/:userId
// @desc    Change user password
router.put('/change-password/:userId', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ messageKey: 'userNotFound' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ messageKey: 'incorrectCurrentPassword' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ messageKey: 'passwordUpdateSuccess' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/users/verify/:userId
// @desc    Verify or un-verify a farmer (Admin only)
router.put('/verify/:userId', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }
        if (user.role !== 'farmer') {
            return res.status(400).json({ msg: 'Can only verify users with the role "farmer".' });
        }

        user.isVerified = !user.isVerified; // Toggle the status
        await user.save();
        res.json({ msg: `User ${user.isVerified ? 'verified' : 'un-verified'} successfully.`, isVerified: user.isVerified });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/users/:userId
// @desc    Delete a user (Admin only)
router.delete('/:userId', adminAuth, async (req, res) => {
    try {
        const userIdToDelete = req.params.userId;

        // Safety check: prevent admin from deleting themselves
        if (userIdToDelete === req.user.id) {
            return res.status(400).json({ msg: 'Admin cannot delete their own account.' });
        }

        const user = await User.findById(userIdToDelete);
        if (!user) {
            return res.status(404).json({ msg: 'User not found.' });
        }

        // Cascading delete: remove associated data
        if (user.role === 'farmer') {
            await Product.deleteMany({ farmer: userIdToDelete });
        } else if (user.role === 'consumer') {
            await Order.deleteMany({ user: userIdToDelete });
        }

        await User.findByIdAndDelete(userIdToDelete);

        res.json({ msg: 'User deleted successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/users/:userId
// @desc    Get user profile information
// NOTE: This needs to be last among GET routes to avoid capturing specific paths like 'all'
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password -cart'); // Exclude sensitive info
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;