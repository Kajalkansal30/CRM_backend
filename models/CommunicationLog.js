const mongoose = require('mongoose');

const CommunicationLogSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED'],
    default: 'PENDING'
  },
  errorMessage: {
    type: String
  },
  sentAt: {
    type: Date
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

module.exports = mongoose.models.CommunicationLog || mongoose.model('CommunicationLog', CommunicationLogSchema);
