const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
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

// @route   GET /api/analytics/summary
// @desc    Get summary analytics for the admin dashboard
router.get('/summary', adminAuth, async (req, res) => {
    try {
        const totalConsumers = await User.countDocuments({ role: 'consumer' });
        const totalFarmers = await User.countDocuments({ role: 'farmer' });
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        const salesData = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);

        res.json({
            totalUsers: totalConsumers + totalFarmers,
            totalConsumers,
            totalFarmers,
            totalProducts,
            totalOrders,
            totalRevenue: salesData.length > 0 ? salesData[0].totalRevenue : 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/analytics/sales-over-time
// @desc    Get sales data grouped by day for the last 30 days
router.get('/sales-over-time', adminAuth, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sales = await Order.aggregate([
            { $match: { 
                status: 'Delivered',
                createdAt: { $gte: thirtyDaysAgo } 
            }},
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalSales: { $sum: "$totalAmount" }
            }},
            { $sort: { _id: 1 } } // Sort by date
        ]);

        res.json(sales);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;