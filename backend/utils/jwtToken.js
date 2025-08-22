const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
  // Short-lived token for security; use refresh tokens for longer sessions in production
  expiresIn: '1h',
  });
};

module.exports = generateToken;