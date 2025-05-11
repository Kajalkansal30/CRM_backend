const { validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const BatchUpdateProcessor = require('../utils/batchUpdateProcessor');

const customerBatchProcessor = new BatchUpdateProcessor(Customer, 100, 5000);

// Create a new customer
const createCustomer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, phone } = req.body;

    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ msg: 'Customer already exists' });
    }

    const customer = new Customer({ name, email, phone });

    // Save customer asynchronously via batch processor
    customerBatchProcessor.enqueue({ id: customer._id, data: customer });

    res.status(201).json(customer);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get all customers
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    if (customers.length === 0) {
      return res.status(404).json({ msg: 'No customers found' });
    }
    res.json(customers);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ msg: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Customer not found' });
    }
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
};
