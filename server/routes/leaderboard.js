const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/leaderboardController')

router.get('/', ctrl.getLeaderboard)

module.exports = router
