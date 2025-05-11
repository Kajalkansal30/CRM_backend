const express = require('express');
const router = express.Router();
const { deliveryReceipt } = require('../controllers/communicationLogController');
const auth = require('../middleware/auth');
const CommunicationLog = require('../models/CommunicationLog');

// Delivery receipt API endpoint
router.post('/delivery-receipt', auth, deliveryReceipt);

// New endpoint to get all communication logs for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const logs = await CommunicationLog.find()
      .populate('campaign')
      .populate('customer')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching communication logs:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
