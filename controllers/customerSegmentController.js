const Segment = require('../models/Segment');
const BatchUpdateProcessor = require('../utils/batchUpdateProcessor');

const segmentBatchProcessor = new BatchUpdateProcessor(Segment, 100, 5000);
const Customer = require('../models/Customer');
const { getMatchingCustomers } = require('../utils/segmentUtils');

/**
 * Get segments that a specific customer belongs to
 * @route GET /api/customers/:id/segments
 * @access Private
 */
const getSegmentsForCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const userId = req.user.id;

    // Validate customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ msg: 'Customer not found' });
    }

    // Fetch all segments for the user
    const segments = await Segment.find({ creator: userId });

    // Filter segments where customer matches the segment rules
    const matchingSegments = [];
    for (const segment of segments) {
      const matchingCustomers = await getMatchingCustomers(segment.rules, Customer);
      if (matchingCustomers.some(cust => cust._id.toString() === customerId)) {
        // Include rules in the response for frontend display
        matchingSegments.push({
          _id: segment._id,
          name: segment.name,
          rules: segment.rules,
          createdAt: segment.createdAt,
          updatedAt: segment.updatedAt,
        });
      }
    }

    res.json(matchingSegments);
  } catch (err) {
    console.error('Error in getSegmentsForCustomer:', err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getSegmentsForCustomer,
};
