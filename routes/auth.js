const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const auth = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/login
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = generateToken(user);

      res.json({ token });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).send('Server error');
    }
  }
);

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { token } = req.body;

  console.log('Received Google token:', token);

  try {
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    console.log('Google token verified');

    const payload = ticket.getPayload();
    console.log('Payload:', payload);

    const { sub, email, name, picture } = payload;

    // Find user by googleId
    let user = await User.findOne({ googleId: sub });

    // If not found by googleId, try to find by email
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // Update googleId if missing
        if (!user.googleId) {
          user.googleId = sub;
          await user.save();
        }
      } else {
        // Create new user if not found by email
        user = new User({
          googleId: sub,
          email,
          name,
          picture,
        });
        await user.save();
      }
    }

    // Generate app JWT token
    const appToken = generateToken(user);

    res.json({ token: appToken, user });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ msg: 'Invalid Google token' });
  }
});

// GET /api/auth/user - Get authenticated user info
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
