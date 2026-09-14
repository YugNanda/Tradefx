const express = require('express')
const router = express.Router()
const { register, login, getMe, forgotPassword, verifyOtp, resetPassword } = require('../controllers/authController')
const protect = require('../middleware/auth')

const { authLimiter } = require('../middleware/security')

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.get('/me', protect, getMe)

router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/verify-otp', authLimiter, verifyOtp)
router.post('/reset-password', authLimiter, resetPassword)

module.exports = router
