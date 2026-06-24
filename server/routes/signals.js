const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const ctrl = require('../controllers/signalController')
const rateLimiter = require('../middleware/rateLimiter')

router.get('/:symbol', protect, rateLimiter({ windowMs: 60000, max: 15 }), ctrl.getSignal)

module.exports = router
