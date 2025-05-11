// routes/segments.js
const express = require('express');
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const {
  createSegment,
  previewSegment,
  getSegments,
  updateSegment,
  getSegmentById,
  deleteSegment,
} = require('../controllers/segmentController');

const router = express.Router();

router.post(
  '/',
  [
    auth,
    check('name', 'Name is required').notEmpty(),
    check('rules', 'Rules are required').notEmpty(),
  ],
  createSegment
);

router.put(
  '/:id',
  [
    auth,
    check('name', 'Name is required').notEmpty(),
    check('rules', 'Rules are required').notEmpty(),
  ],
  updateSegment
);

router.post('/preview', auth, previewSegment);

router.get('/', auth, getSegments);

router.get('/:id', auth, getSegmentById);

router.delete('/:id', auth, deleteSegment);

module.exports = router;
