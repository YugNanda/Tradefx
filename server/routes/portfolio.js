const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const ctrl = require('../controllers/portfolioController')

const { tradeOrderLimiter } = require('../middleware/security')

router.use(protect)
router.get('/', ctrl.getPortfolio)
router.get('/transactions', ctrl.getTransactions)
router.post('/buy', tradeOrderLimiter, ctrl.buy)
router.post('/sell', tradeOrderLimiter, ctrl.sell)

module.exports = router
