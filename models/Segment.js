// models/Segment.js
const mongoose = require('mongoose');

const SegmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rules: {
    type: Object,
    required: true
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
}, { timestamps: true });

// Add unique compound index on name and creator to enforce uniqueness at DB level
SegmentSchema.index({ name: 1, creator: 1 }, { unique: true });

module.exports = mongoose.models.Segment || mongoose.model('Segment', SegmentSchema);
