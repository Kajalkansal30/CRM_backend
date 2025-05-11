// const express = require('express');
// const router = express.Router();
// const { check } = require('express-validator');
// const auth = require('../middleware/auth');
// const {
//   createOrder,
//   getOrders,
//   getOrdersByCustomerId,  // Added missing import
//   getOrderById,
// } = require('../controllers/orderController');

// router.post(
//   '/',
//   [
//     auth,
//     [
//       check('customer', 'Customer ID is required').not().isEmpty(),
//       check('amount', 'Amount is required and must be a number').isNumeric(),
//       check('items', 'Items are required and must be an array').isArray()
//     ]
//   ],
//   createOrder
// );

// router.get('/', auth, getOrders);

// // New route to get orders by customer ID
// router.get('/customers/:id/orders', auth, getOrdersByCustomerId);

// // New route to get order by ID
// router.get('/:id', auth, getOrderById);

// module.exports = router;


// Modified orders.js route file
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const {
  createOrder,
  getOrders,
  getOrdersByCustomerId,
  getOrderById,
} = require('../controllers/orderController');

// Make sure route order is correct - more specific routes should come first
router.get('/customer/:id', auth, getOrdersByCustomerId);

// Order by ID route - keep this AFTER other specific routes
router.get('/:id', auth, getOrderById);

router.get('/', auth, getOrders);

router.post(
  '/',
  [
    auth,
    [
      check('customer', 'Customer ID is required').not().isEmpty(),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('items', 'Items are required and must be an array').isArray()
    ]
  ],
  createOrder
);

// New route to update order status
const { updateOrderStatus } = require('../controllers/orderController');
router.patch('/:id/status', auth, updateOrderStatus);

module.exports = router;
