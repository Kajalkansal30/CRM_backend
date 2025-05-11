const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
const BatchUpdateProcessor = require('../utils/batchUpdateProcessor');

const customerBatchProcessor = new BatchUpdateProcessor(Customer, 100, 5000);
const orderBatchProcessor = new BatchUpdateProcessor(Order, 100, 5000);

// Create a new order
const createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { customer, amount, items, status } = req.body;

  try {
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      return res.status(404).json({ msg: 'Customer not found' });
    }

    const order = new Order({
      customer,
      amount,
      items,
      status: status || 'pending',
      orderDate: new Date(),
    });

    // Save order asynchronously via batch processor
    orderBatchProcessor.enqueue({ id: order._id, data: order });

    // Update customer's totalSpend and visits asynchronously via batch processor
    customerBatchProcessor.enqueue({
      id: customerExists._id,
      data: {
        $inc: { totalSpend: amount, visits: 1 },
        lastActive: new Date(),
      },
    });

    res.status(201).json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

const getOrdersByCustomerId = async (req, res) => {
  try {
    const customerId = req.params.id;
    const orders = await Order.find({ customer: customerId })
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log('getOrderById - Received orderId:', orderId);  // Debug log
    
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.log('Invalid ObjectId format:', orderId);
      return res.status(400).json({ msg: 'Invalid order ID format' });
    }
    
    const order = await Order.findById(orderId).populate('customer', 'name email phone address');
    console.log('getOrderById - Query result:', order);  // Debug log
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Transform _id to id in the response
    const orderObj = order.toObject();
    orderObj.id = orderObj._id.toString(); // Ensure ID is converted to string
    delete orderObj._id;
    
    res.json(orderObj);
  } catch (err) {
    console.error('Error in getOrderById:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ msg: 'Invalid order ID format' });
    }

    // Validate status value
    const validStatuses = ['pending', 'cancelled', 'sent', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // Save order status asynchronously via batch processor
    orderBatchProcessor.enqueue({ id: order._id, data: { status } });

    res.json({ msg: 'Order status update enqueued for batch processing', order });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrdersByCustomerId,
  getOrderById,
  updateOrderStatus,
};

