const jwt = require('jsonwebtoken');

// Define constants for status codes
const UNAUTHORIZED_STATUS = 401;
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(UNAUTHORIZED_STATUS).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    console.log('Auth middleware token:', token);  // Debug log for received token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Auth middleware decoded user:', decoded.user);  // Debug log for decoded payload
    req.user = decoded.user;  // Assuming token payload has { user: { id: ... } }
    next();
  } catch (err) {
    console.error('Auth middleware token verification error:', err.message);
    res.status(UNAUTHORIZED_STATUS).json({ msg: 'Token is not valid' });
  }
};
