const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: 'https://via.placeholder.com/300x200.png?text=Produce' },
  description: { type: String },
  // Link to the farmer who posted the product
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Product', ProductSchema);