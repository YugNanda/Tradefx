const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const ctrl = require('../controllers/alertController')

router.use(protect)
router.get('/', ctrl.getAlerts)
router.post('/', ctrl.createAlert)
router.delete('/:id', ctrl.deleteAlert)

module.exports = router
