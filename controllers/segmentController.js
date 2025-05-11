const { check, validationResult } = require('express-validator');
const Segment = require('../models/Segment');
const BatchUpdateProcessor = require('../utils/batchUpdateProcessor');
const Customer = require('../models/Customer');
const { getMatchingCustomers } = require('../utils/segmentUtils');

const segmentBatchProcessor = new BatchUpdateProcessor(Segment, 100, 5000);

/**
 * Utility function to recursively iterate and log rules
 * @param {Object} rule - The rule object to iterate
 * @param {Number} depth - Current depth for indentation
 */
const iterateRules = (rule, depth = 0) => {
  const indent = '  '.repeat(depth);
  if (!rule) return;
  if (rule.operator === 'AND' || rule.operator === 'OR') {
    console.log(`${indent}Operator: ${rule.operator}`);
    if (rule.conditions && Array.isArray(rule.conditions)) {
      rule.conditions.forEach(cond => iterateRules(cond, depth + 1));
    }
  } else {
    console.log(`${indent}Condition - Field: ${rule.field}, Operator: ${rule.operator}, Value: ${rule.value}`);
  }
};

/**
 * @route   POST /api/segments
 * @desc    Create a segment
 * @access  Private
 */
const createSegment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, rules } = req.body;

    if (!name || !rules) {
      console.error('Missing name or rules in request body');
      return res.status(400).json({ errors: [{ msg: 'Name and rules are required' }] });
    }

    if (!req.user || !req.user.id) {
      console.error('Unauthorized: User not authenticated');
      return res.status(401).json({ msg: 'Unauthorized: User not authenticated' });
    }

    // Check for duplicate segment name for the same user
    const existingSegment = await Segment.findOne({ name, creator: req.user.id });
    if (existingSegment) {
      console.error('Segment name already exists:', name);
      return res.status(400).json({ errors: [{ msg: 'Segment name already exists' }] });
    }

    console.log('Segment creation request by user:', req.user.id);
    console.log('Segment name:', name);
    console.log('Segment rules:', JSON.stringify(rules));

    // Debug: Log rules type and content
    console.log('Type of rules:', typeof rules);
    console.log('Rules content:', rules);

    // Iterate and log rules structure
    console.log('Iterating rules:');
    iterateRules(rules);

    // Calculate audience size using getMatchingCustomers
    const matchingCustomers = await getMatchingCustomers(rules, Customer);
    console.log('Matching customers count:', matchingCustomers.length);
    const audienceSize = matchingCustomers.length;

    const segment = new Segment({
      name,
      rules,
      creator: req.user.id,
      audienceSize,
    });

    const savedSegment = await segment.save();
    console.log('Saved segment:', savedSegment);
    res.status(201).json(savedSegment);
  } catch (err) {
    console.error('Error in createSegment:', err.message);
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ errors: [{ msg: 'Segment name already exists' }] });
    }
    res.status(500).send('Server Error');
  }
};

/**
 * @route   PUT /api/segments/:id
 * @desc    Update a segment
 * @access  Private
 */
const updateSegment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const segmentId = req.params.id;
    const { name, rules } = req.body;

    if (!name || !rules) {
      console.error('Missing name or rules in request body');
      return res.status(400).json({ errors: [{ msg: 'Name and rules are required' }] });
    }

    if (!req.user || !req.user.id) {
      console.error('Unauthorized: User not authenticated');
      return res.status(401).json({ msg: 'Unauthorized: User not authenticated' });
    }

    // Enqueue update for batch processing
    segmentBatchProcessor.enqueue({ id: segmentId, data: { name, rules } });

    res.json({ message: 'Segment update enqueued for batch processing' });
  } catch (err) {
    console.error('Error enqueuing segment update:', err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   GET /api/segments/:id
 * @desc    Get segment by ID
 * @access  Private
 */
const getSegmentById = async (req, res) => {
  try {
    const segmentId = req.params.id;
    
    if (!segmentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid segment ID' });
    }
    
    const segment = await Segment.findOne({ _id: segmentId, creator: req.user.id });
    
    if (!segment) {
      return res.status(404).json({ msg: 'Segment not found' });
    }
    
    // Always get fresh audience data for accuracy
    const matchingCustomers = await getMatchingCustomers(segment.rules, Customer);
    const audienceSize = matchingCustomers.length;
    const audienceNames = matchingCustomers.slice(0, 5).map(cust => cust.name); // Sample names
    
    // Prepare response data
    const responseData = {
      ...segment.toObject(),
      audienceSize,
      audienceNames,
      rules: segment.rules,
      _id: segment._id,
      name: segment.name,
      creator: segment.creator
    };
    
    res.json(responseData);
  } catch (err) {
    console.error('Error in getSegmentById:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

/**
 * @route   GET /api/segments/preview
 * @desc    Preview audience size for a segment
 * @access  Private
 */
const previewSegment = async (req, res) => {
  try {
    const { rules } = req.body;

    if (!rules) {
      return res.status(400).json({ errors: [{ msg: 'Rules are required' }] });
    }

    // Get matching customers
    const matchingCustomers = await getMatchingCustomers(rules, Customer);

    res.json({
      audienceSize: matchingCustomers.length,
      // Return a sample of matching customers for preview with only names
      sampleCustomers: matchingCustomers.slice(0, 5).map(cust => ({
        _id: cust._id,
        name: cust.name
      })),
    });
  } catch (err) {
    console.error('Error in previewSegment:', err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   GET /api/segments
 * @desc    Get all segments with dynamic audience size calculation
 * @access  Private
 */
const getSegments = async (req, res) => {
  try {
    const segments = await Segment.find({ creator: req.user.id })
      .sort({ createdAt: -1 });

    // Dynamically calculate audience size for each segment
    const segmentsWithAudience = await Promise.all(
      segments.map(async (segment) => {
        const matchingCustomers = await getMatchingCustomers(segment.rules, Customer);
        return {
          ...segment.toObject(),
          rules: segment.rules,
          audienceSize: matchingCustomers.length,
        };
      })
    );

    res.json(segmentsWithAudience);
  } catch (err) {
    console.error('Error in getSegments:', err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   DELETE /api/segments/:id
 * @desc    Delete a segment by ID
 * @access  Private
 */
const deleteSegment = async (req, res) => {
  try {
    const segmentId = req.params.id;

    if (!segmentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid segment ID' });
    }

    const segment = await Segment.findOne({ _id: segmentId, creator: req.user.id });

    if (!segment) {
      return res.status(404).json({ msg: 'Segment not found' });
    }

    await Segment.deleteOne({ _id: segmentId });

    res.json({ msg: 'Segment deleted successfully' });
  } catch (err) {
    console.error('Error deleting segment:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

module.exports = { 
  createSegment, 
  updateSegment, 
  getSegmentById, 
  previewSegment, 
  getSegments,
  deleteSegment
};
