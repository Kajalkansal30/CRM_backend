const express = require('express');
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const {
  createCustomer,
  getCustomers,
  getCustomerById,
} = require('../controllers/customerController');

const { getSegmentsForCustomer } = require('../controllers/customerSegmentController');

const router = express.Router();

router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
    ],
  ],
  createCustomer
);

router.get('/', auth, getCustomers);

router.get('/:id', auth, getCustomerById);

// New route to get segments for a customer
router.get('/:id/segments', auth, getSegmentsForCustomer);

module.exports = router;
