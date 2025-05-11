const Campaign = require('../models/Campaign');
const Segment = require('../models/Segment');
const Customer = require('../models/Customer');
const CommunicationLog = require('../models/CommunicationLog');
const BatchUpdateProcessor = require('../utils/batchUpdateProcessor');
const { initiateCampaignDelivery } = require('./communicationLogController');
const { getMatchingCustomers } = require('../utils/segmentUtils');

const campaignBatchProcessor = new BatchUpdateProcessor(Campaign, 100, 5000);
const segmentBatchProcessor = new BatchUpdateProcessor(Segment, 100, 5000);

// @route   GET /api/campaigns
// @desc    Get all campaigns for the logged-in user
// @access  Private
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ creator: req.user.id })
      .populate('segment', 'name audienceSize')
      .sort({ createdAt: -1 });
    if (!campaigns.length) {
      return res.status(404).json({ msg: 'No campaigns found' });
    }

    // Aggregate communication log statuses per campaign
    const campaignIds = campaigns.map(c => c._id);
    const communicationLogs = await CommunicationLog.aggregate([
      { $match: { campaign: { $in: campaignIds } } },
      {
        $group: {
          _id: '$campaign',
          sentCount: { $sum: { $cond: [{ $eq: ['$status', 'SENT'] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        }
      }
    ]);

    // Map communication log counts by campaign id
    const communicationLogMap = {};
    communicationLogs.forEach(log => {
      communicationLogMap[log._id.toString()] = {
        sentCount: log.sentCount,
        failedCount: log.failedCount,
        pendingCount: log.pendingCount,
      };
    });

    // Enhance campaigns with audienceSize and communication log counts
    const campaignsWithDetails = campaigns.map(campaign => {
      const audienceSize = campaign.segment ? campaign.segment.audienceSize : 0;
      const commLogCounts = communicationLogMap[campaign._id.toString()] || {
        sentCount: 0,
        failedCount: 0,
        pendingCount: 0,
      };
      return {
        ...campaign.toObject(),
        audienceSize,
        sentCount: commLogCounts.sentCount,
        failedCount: commLogCounts.failedCount,
        pendingCount: commLogCounts.pendingCount,
      };
    });

    res.json(campaignsWithDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @route   POST /api/campaigns
// @desc    Create a new campaign and initiate delivery
// @access  Private
const createCampaign = async (req, res) => {
  const { name, description, type, segment, content, status, scheduleDate } = req.body;

  if (!name || !segment || !content || !content.subject || !content.body || !status) {
    return res.status(400).json({ msg: 'Please provide all required fields' });
  }

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ msg: 'Unauthorized: User not authenticated' });
    }

    const segmentExists = await Segment.findById(segment);
    if (!segmentExists) {
      return res.status(404).json({ msg: 'Segment not found' });
    }

    const campaign = new Campaign({
      name,
      description,
      type,
      segment,
      content,
      status,
      scheduleDate,
      creator: req.user.id,
    });

    await campaign.save();

    // Fetch customers matching segment rules using segmentUtils
    const customers = await getMatchingCustomers(segmentExists.rules, Customer);

    // Update audienceSize in campaign asynchronously via batch processor
    campaignBatchProcessor.enqueue({ id: campaign._id, data: { audienceSize: customers.length } });

    // Update segment audienceSize asynchronously via batch processor
    segmentBatchProcessor.enqueue({ id: segmentExists._id, data: { audienceSize: customers.length } });

    // Initiate campaign delivery (create communication logs and send messages)
    await initiateCampaignDelivery(campaign, customers, content.body);

    // Include audience names in response for preview
    const audienceNames = customers.map(cust => cust.name);

    res.status(201).json({ campaign, audienceNames });
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @route   PUT /api/campaigns/:id
// @desc    Update an existing campaign by id
// @access  Private
const updateCampaign = async (req, res) => {
  const campaignId = req.params.id;
  const { name, description, type, segment, content, status, scheduleDate } = req.body;

  if (!name || !segment || !content || !content.subject || !content.body || !status) {
    return res.status(400).json({ msg: 'Please provide all required fields' });
  }

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ msg: 'Unauthorized: User not authenticated' });
    }

    const segmentExists = await Segment.findById(segment);
    if (!segmentExists) {
      return res.status(404).json({ msg: 'Segment not found' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ msg: 'Campaign not found' });
    }

    if (campaign.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Forbidden: Not authorized to update this campaign' });
    }

    campaign.name = name;
    campaign.description = description;
    campaign.type = type;
    campaign.segment = segment;
    campaign.content = content;
    campaign.status = status;
    campaign.scheduleDate = scheduleDate;

    // Save campaign asynchronously via batch processor
    campaignBatchProcessor.enqueue({ id: campaign._id, data: {
      name,
      description,
      type,
      segment,
      content,
      status,
      scheduleDate
    }});

    res.json({ message: 'Campaign update enqueued for batch processing' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @route   GET /api/campaigns/:id
// @desc    Get a campaign by ID for the logged-in user
// @access  Private
const getCampaignById = async (req, res) => {
  try {
    let campaign = await Campaign.findOne({ _id: req.params.id, creator: req.user.id })
      .populate('segment', 'name audienceSize rules description'); // Added description field
    if (!campaign) {
      return res.status(404).json({ msg: 'Campaign not found' });
    }

    // Refresh audienceSize by recalculating matching customers
    let audienceNames = [];
    if (campaign.segment && campaign.segment.rules) {
      const customers = await getMatchingCustomers(campaign.segment.rules, require('../models/Customer'));
      campaign.audienceSize = customers.length;
      audienceNames = customers.map(cust => cust.name);
      // Update the segment's audienceSize asynchronously via batch processor
      segmentBatchProcessor.enqueue({ id: campaign.segment._id, data: { audienceSize: customers.length } });
      // Save campaign asynchronously via batch processor
      campaignBatchProcessor.enqueue({ id: campaign._id, data: { audienceSize: customers.length } });
    }

    const campaignObj = campaign.toObject();
    campaignObj.audienceNames = audienceNames;

    res.json(campaignObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @route   DELETE /api/campaigns/:id
// @desc    Delete a campaign by ID
// @access  Private
const deleteCampaign = async (req, res) => {
  try {
    const campaignId = req.params.id;

    if (!campaignId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ msg: 'Invalid campaign ID' });
    }

    const campaign = await Campaign.findOne({ _id: campaignId, creator: req.user.id });

    if (!campaign) {
      return res.status(404).json({ msg: 'Campaign not found' });
    }

    await Campaign.deleteOne({ _id: campaignId });

    res.json({ msg: 'Campaign deleted successfully' });
  } catch (err) {
    console.error('Error deleting campaign:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

const { generateMessageSuggestions } = require('../utils/openaiClient');
const { generateMessageSuggestionsGoogle } = require('../utils/googleGenerativeAIClient');

const generateMessageSuggestionsController = async (req, res) => {
  try {
    const { campaignObjective, segmentDescription } = req.body;

    if (!campaignObjective || typeof campaignObjective !== 'string' || campaignObjective.trim() === '') {
      return res.status(400).json({ 
        msg: 'campaignObjective is required and must be a non-empty string',
        details: 'Please provide a valid campaign objective for message generation'
      });
    }

    if (segmentDescription && (typeof segmentDescription !== 'string' || segmentDescription.trim() === '')) {
      return res.status(400).json({
        msg: 'segmentDescription must be a non-empty string if provided',
        details: 'Please provide a valid segment description or omit the field'
      });
    }

    let suggestions;
    try {
      suggestions = await generateMessageSuggestionsGoogle(campaignObjective.trim(), segmentDescription ? segmentDescription.trim() : '');
    } catch (googleError) {
      console.warn('Google AI generation failed, falling back to OpenAI:', googleError);
      const prompt = `Generate exactly 3 marketing message variants as a JSON array. Each variant should have "subject" and "body" properties.
Campaign Objective: "${campaignObjective.trim()}"
Target Audience: "${segmentDescription ? segmentDescription.trim() : 'general audience'}"

Example format:
[
  {
    "subject": "Subject line 1",
    "body": "Message body 1"
  },
  {
    "subject": "Subject line 2",
    "body": "Message body 2"
  }
]`;

      console.log('Sending prompt to OpenAI:', prompt);

      suggestions = await generateMessageSuggestions(prompt, 3);

      if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('Received invalid suggestions format from OpenAI');
      }
    }

    // Validate each suggestion has required fields
    const validatedSuggestions = suggestions.map((suggestion, index) => {
      if (!suggestion.subject || !suggestion.body) {
        console.warn(`Invalid suggestion at index ${index}:`, suggestion);
        return {
          subject: `Generated Subject ${index + 1}`,
          body: JSON.stringify(suggestion)
        };
      }
      return suggestion;
    });

    res.json({ 
      success: true,
      suggestions: validatedSuggestions.slice(0, 3) // Ensure max 3 suggestions
    });

  } catch (error) {
    console.error('Message generation error:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    });

    res.status(500).json({ 
      msg: 'Failed to generate message suggestions',
      error: error.message,
      details: 'Please check your input and try again. If the problem persists, contact support.'
    });
  }
};

module.exports = {
  getCampaigns,
  createCampaign,
  updateCampaign,
  getCampaignById,
  deleteCampaign,
  generateMessageSuggestionsController,
};
