const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Initialize passport Google OAuth strategy in a separate config file (not shown here)
// Make sure to require and configure it in your server.js or app.js

// Route to start Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback route
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    console.log('Google OAuth callback route hit');
    console.log('req.user:', req.user);
    try {
      // User authenticated by passport, generate JWT token
      const user = req.user;

      // Create JWT token payload
      const payload = {
        id: user._id,
        email: user.email,
        name: user.name,
      };

      // Sign token (use your secret and expiration)
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      // Redirect to frontend with token as query param
      console.log('Redirecting to:', `${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      res.redirect('/login');
    }
  }
);

module.exports = router;
