// models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String
  },
  totalSpend: {
    type: Number,
    default: 0
  },
  visits: {
    type: Number,
    default: 0
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
}, { timestamps: true });

module.exports =mongoose.models.Customer|| mongoose.model('Customer', CustomerSchema);