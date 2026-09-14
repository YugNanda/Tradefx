const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const ctrl = require('../controllers/analyticsController')

router.use(protect)

router.get('/summary', ctrl.getAnalytics)
router.get('/export/csv', ctrl.exportCsv)
router.post('/reset-balance', ctrl.resetBalance)

module.exports = router
