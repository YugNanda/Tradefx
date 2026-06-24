const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/newsController')
const rateLimiter = require('../middleware/rateLimiter')

router.get('/', rateLimiter({ windowMs: 60000, max: 20 }), ctrl.getNews) // ?symbol=AAPL (optional)

module.exports = router
