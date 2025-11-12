const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to protect admin routes (copied from users.js for simplicity)
const adminAuth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, 'secretKey');
        const user = await User.findById(decoded.id);
        if (user && user.role === 'admin') {
            req.user = user;
            next();
        } else { throw new Error(); }
    } catch (err) { res.status(401).json({ msg: 'Token is not valid' }); }
};

// @route   GET /api/admin/orders
// @desc    Get all orders for the admin dashboard
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'username name') // Populate consumer details
            .populate({
                path: 'items.product',
                select: 'name farmer',
                populate: {
                    path: 'farmer',
                    select: 'username name' // Populate farmer details for each product
                }
            })
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;