const CommunicationLog = require('../models/CommunicationLog');
const Customer = require('../models/Customer');
const axios = require('axios'); // Use require for axios
const BatchUpdateProcessor = require('../utils/batchUpdateProcessor');

const communicationLogBatchProcessor = new BatchUpdateProcessor(CommunicationLog, 100, 5000);

// Create communication logs for a campaign and send messages via dummy vendor API
const initiateCampaignDelivery = async (campaign, customers, messageTemplate) => {
  const communicationLogs = [];

  for (const customer of customers) {
    // Personalize message
    const personalizedMessage = messageTemplate.replace('{name}', customer.name);

    // Create communication log entry with status PENDING
    const log = new CommunicationLog({
      campaign: campaign._id,
      customer: customer._id,
      message: personalizedMessage,
      status: 'PENDING',
    });
    // Save log asynchronously via batch processor
    communicationLogBatchProcessor.enqueue({ id: log._id, data: log });
    communicationLogs.push(log);

    // Simulate sending message via dummy vendor API
    // The dummy vendor API will randomly succeed or fail (~90% success)
    try {
      await axios.post('http://localhost:5000/api/vendor/send', {
        communicationLogId: log._id,
        customerId: customer._id,
        message: personalizedMessage,
      });
    } catch (err) {
      console.error('Error sending message to vendor API:', err.message);
    }
  }

  return communicationLogs;
};

// Delivery receipt API handler
const deliveryReceipt = async (req, res) => {
  const { communicationLogId, status, errorMessage } = req.body;

  if (!communicationLogId || !status) {
    return res.status(400).json({ msg: 'communicationLogId and status are required' });
  }

  try {
    const log = await CommunicationLog.findById(communicationLogId);
    if (!log) {
      return res.status(404).json({ msg: 'Communication log not found' });
    }

    log.status = status;
    if (status === 'SENT') {
      log.sentAt = new Date();
      log.errorMessage = undefined;
    } else if (status === 'FAILED') {
      log.errorMessage = errorMessage || 'Unknown error';
    }

    // Save log asynchronously via batch processor
    communicationLogBatchProcessor.enqueue({ id: log._id, data: log });

    res.json({ msg: 'Delivery receipt updated' });
  } catch (err) {
    console.error('Error updating delivery receipt:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = {
  initiateCampaignDelivery,
  deliveryReceipt,
};

