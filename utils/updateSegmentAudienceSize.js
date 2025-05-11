const Segment = require('../models/Segment');
const Customer = require('../models/Customer');
const { getMatchingCustomers } = require('../utils/segmentUtils');

/**
 * Recalculate and update audienceSize for all segments in the database.
 */
async function updateAllSegmentAudienceSizes() {
  try {
    const segments = await Segment.find({});
    for (const segment of segments) {
      const customers = await getMatchingCustomers(segment.rules, Customer);
      segment.audienceSize = customers.length;
      await segment.save();
      console.log(`Updated segment ${segment.name} audienceSize to ${segment.audienceSize}`);
    }
    console.log('All segment audience sizes updated successfully.');
  } catch (error) {
    console.error('Error updating segment audience sizes:', error);
  }
}

// If run as a script, execute the update function
if (require.main === module) {
  updateAllSegmentAudienceSizes()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { updateAllSegmentAudienceSizes };
