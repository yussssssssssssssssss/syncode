const express = require('express');
const { register, login, logout } = require('../controllers/auth.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected test route
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
