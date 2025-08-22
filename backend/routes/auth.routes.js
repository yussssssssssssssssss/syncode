const express = require('express');
const { register, login, logout } = require('../controllers/auth.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();
const rateLimit = require('express-rate-limit');

// Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);

// Protected test route
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
