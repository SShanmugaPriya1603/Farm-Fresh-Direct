const express = require('express');
const Feedback = require('../models/Feedback');
const router = express.Router();

// @route   POST /api/feedback
// @desc    Submit new feedback
router.post('/', async (req, res) => {
  try {
    const { userId, rating, comment } = req.body;

    // Basic validation
    if (!userId || !rating || !comment) {
      return res.status(400).json({ msg: 'Please provide all required fields.' });
    }

    const newFeedback = new Feedback({
      user: userId,
      rating,
      comment
    });

    await newFeedback.save();

    res.status(201).json({ msg: 'Thank you for your feedback!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;