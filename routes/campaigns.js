const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getCampaigns,
  createCampaign,
  updateCampaign,
  getCampaignById,
  deleteCampaign,
  generateMessageSuggestionsController,
} = require('../controllers/campaignController');


router.get('/', auth, getCampaigns);

router.get('/:id', auth, getCampaignById);

router.post('/', auth, createCampaign);

router.post('/generate-message-suggestions', auth, generateMessageSuggestionsController);

router.put('/:id', auth, updateCampaign);

router.delete('/:id', auth, deleteCampaign);

module.exports = router;
