const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push'],
    default: 'email'
  },
  segment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Segment',
    required: true
  },
  content: {
    subject: { type: String },
    body: { type: String }
  },
  sendTestTo: {
    type: String
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  audienceSize: {
    type: Number,
    default: 0
  },
  sent: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'completed'],
    default: 'draft'
  },
  scheduleDate: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
