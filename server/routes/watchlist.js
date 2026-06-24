const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const ctrl = require('../controllers/watchlistController')

router.use(protect)
router.get('/', ctrl.getWatchlist)
router.post('/', ctrl.addToWatchlist)
router.delete('/:symbol', ctrl.removeFromWatchlist)

module.exports = router
