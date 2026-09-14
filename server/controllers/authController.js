const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' })
    }

    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password })

    const token = signToken(user._id)
    user.lastLogin = new Date()
    await user.save()

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: user.toSafeObject(),
    })
  } catch (err) {
    console.error('Register error:', err)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' })
    }
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = signToken(user._id)
    user.lastLogin = new Date()
    await user.save()

    res.json({
      message: 'Logged in successfully',
      token,
      user: user.toSafeObject(),
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
}

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: user.toSafeObject() })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

// ── 6-Digit OTP Password Reset Flow ──────────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email address is required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(404).json({ message: 'No TradeX account found with this email address' })
    }

    // Generate random 6-digit numeric OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    user.resetPasswordOtp = otp
    user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
    await user.save()

    console.log(`🔑 [SECURITY OTP] Password Reset OTP for ${email}: [ ${otp} ] (Valid 10 mins)`)

    res.json({
      message: '6-digit verification code generated successfully',
      email: user.email,
      otp, // Provided in response for interactive simulation & browser verification popup
    })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
}

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ message: 'Email and 6-digit OTP are required' })

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOtp: String(otp).trim(),
      resetPasswordOtpExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired 6-digit verification code' })
    }

    res.json({
      verified: true,
      message: 'Verification code verified successfully',
    })
  } catch (err) {
    console.error('Verify OTP error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' })
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOtp: String(otp).trim(),
      resetPasswordOtpExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired 6-digit verification code' })
    }

    // Set new password (bcrypt pre-save hook in User model hashes it)
    user.password = newPassword
    user.resetPasswordOtp = undefined
    user.resetPasswordOtpExpires = undefined
    user.lastLogin = new Date()
    await user.save()

    const token = signToken(user._id)

    console.log(`✅ [SECURITY] Password reset successfully and authenticated for ${email}`)

    res.json({
      success: true,
      message: 'Password reset successfully! Logged in to TradeX.',
      token,
      user: user.toSafeObject(),
    })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
}
