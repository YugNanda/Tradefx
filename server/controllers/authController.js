const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
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
    await user.save({ validateBeforeSave: false })

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: user.toSafeObject()
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
    await user.save({ validateBeforeSave: false })

    res.json({
      message: 'Logged in successfully',
      token,
      user: user.toSafeObject()
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
