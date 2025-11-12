const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String, unique: true, sparse: true }, // sparse allows multiple null/undefined values
  phone: { type: String, default: '' },
  role: { type: String, enum: ["consumer", "admin", "farmer"], required: true },
  experience: { type: String, default: '' }, // e.g., "10+ years in organic farming"
  awards: { type: String, default: '' }, // e.g., "Krishi Karman Award 2020"
  techUsed: { type: String, default: '' }, // e.g., "Drip Irrigation, Soil Moisture Sensors"
  aadhar: { type: String, required: function () { return this.role === "farmer"; } },
  isVerified: { type: Boolean, default: false }, // Admin-verified status for farmers
  password: { type: String, required: true },
  cart: [CartItemSchema]
});

module.exports = mongoose.model("User", UserSchema);
