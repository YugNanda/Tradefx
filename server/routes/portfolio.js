const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const ctrl = require('../controllers/portfolioController')

router.use(protect)
router.get('/', ctrl.getPortfolio)
router.get('/transactions', ctrl.getTransactions)
router.post('/buy', ctrl.buy)
router.post('/sell', ctrl.sell)

module.exports = router
