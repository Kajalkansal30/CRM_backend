const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
  return jwt.sign(
    {
      user: {
        id: user._id ? user._id.toString() : user.id,
        email: user.email,
        name: user.name,
      }
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

module.exports = generateToken;
