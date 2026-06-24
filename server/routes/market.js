const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/marketController')
const rateLimiter = require('../middleware/rateLimiter')

const quoteLimiter = rateLimiter({ windowMs: 60000, max: 60 })

router.get('/search', ctrl.search)
router.get('/symbols', ctrl.listSymbols)
router.get('/quotes', quoteLimiter, ctrl.getQuotes)       // ?symbols=AAPL,BTC,NIFTY50
router.get('/quote/:symbol', quoteLimiter, ctrl.getQuote)
router.get('/history/:symbol', ctrl.getHistory)

module.exports = router
