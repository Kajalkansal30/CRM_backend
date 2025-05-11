const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  items: [{
    name: String,
    price: Number,
    quantity: Number
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'cancelled', 'completed'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true }); // Adds createdAt & updatedAt automatically

// Update customer's totalSpend, visits, and lastActive after an order is saved
OrderSchema.post('save', async function () {
  try {
    const Customer = mongoose.models.Customer || mongoose.model('Customer');
    const customer = await Customer.findById(this.customer);
    if (customer) {
      customer.totalSpend += this.amount;
      customer.visits += 1;
      customer.lastActive = Date.now();
      await customer.save();
    }
  } catch (err) {
    console.error('Error updating customer after order save:', err);
  }
});

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
