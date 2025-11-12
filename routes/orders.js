const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');

const router = express.Router();

// @route   POST /api/orders
// @desc    Create a new order
router.post('/', async (req, res) => {
    try {
        const { userId, shippingAddress, paymentMethod } = req.body;
        const user = await User.findById(userId).populate('cart.product');

        if (!user || user.cart.length === 0) {
            return res.status(400).json({ msg: 'Cart is empty or user not found.' });
        }

        const orderItems = user.cart.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.product.price // Price at time of order
        }));

        const totalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        const order = new Order({
            user: userId,
            items: orderItems,
            totalAmount,
            shippingAddress,
            paymentMethod,
            paymentStatus: 'Pending' // Or 'Completed' if payment is instant
        });

        await order.save();

        // Clear the user's cart
        user.cart = [];
        await user.save();

        res.status(201).json({ msg: 'Order placed successfully!', order });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/orders/:userId
// @desc    Get all orders for a specific consumer
router.get('/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ user: req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/orders/details/:orderId
// @desc    Get details for a single order
router.get('/details/:orderId', async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('user', 'username').populate('items.product', 'name');
        if (!order) return res.status(404).json({ msg: 'Order not found' });
        res.json(order);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/orders/:orderId
// @desc    Cancel an order (by consumer)
router.delete('/:orderId', async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        // Add logic here to check if the user is authorized to cancel
        order.status = 'Cancelled';
        await order.save();
        res.json({ msg: 'Order cancelled successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/orders/farmer/:farmerId
// @desc    Get all orders for a specific farmer
router.get('/farmer/:farmerId', async (req, res) => {
    try {
        const farmerId = new mongoose.Types.ObjectId(req.params.farmerId);

        const orders = await Order.aggregate([
            // Deconstruct the items array
            { $unwind: '$items' },
            // Join with products collection
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            // Filter for items that belong to the farmer
            { $match: { 'productDetails.farmer': farmerId } },
            // Group back by order ID, collecting relevant items and user info
            {
                $group: {
                    _id: '$_id',
                    user: { $first: '$user' },
                    status: { $first: '$status' },
                    paymentStatus: { $first: '$paymentStatus' },
                    createdAt: { $first: '$createdAt' },
                    items: { $push: {
                        product: { $arrayElemAt: ['$productDetails', 0] },
                        quantity: '$items.quantity'
                    } }
                }
            },
            // Join with users to get consumer username
            { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDetails' } },
            // Filter out completed or cancelled orders so farmers only see active ones
            {
                $match: {
                    $and: [
                        { status: { $ne: 'Cancelled' } },
                        { $or: [
                            { status: { $ne: 'Delivered' } },
                            { paymentStatus: { $ne: 'Completed' } }
                        ]}
                    ]
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json(orders);
    } catch (err) {
        console.error('Aggregation Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/orders/status/:orderId
// @desc    Update order status (by farmer/admin)
router.put('/status/:orderId', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        // In a real app, we'd verify the user (farmer/admin) has permission.
        order.status = status;

        await order.save();

        res.json({ msg: 'Order status updated successfully', order });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/orders/confirm-payment/:orderId
// @desc    Consumer confirms payment for a delivered COD order
router.post('/confirm-payment/:orderId', async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        // Add security check here to ensure req.body.userId matches order.user

        if (order.status === 'Delivered' && order.paymentStatus === 'Pending') {
            order.paymentStatus = 'Completed';
            await order.save();
            res.json({ msg: 'Payment confirmed. Thank you!' });
        } else {
            res.status(400).json({ msg: 'This action is not applicable for this order.' });
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;