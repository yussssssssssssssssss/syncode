const express = require('express');
const { create, join, users, getByCode } = require('../controllers/room.controller');

const router = express.Router();

router.post('/create', create);
router.post('/join', join);
router.get('/:roomId/users', users);
router.get('/:code', getByCode);

module.exports = router;
