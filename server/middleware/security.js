const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

// Helmet security headers configured for financial dashboard (allowing CDN fonts/styles/websockets)
const securityHeaders = helmet({
  contentSecurityPolicy: false, // handled by host in production or relaxed for SPA assets
  crossOriginEmbedderPolicy: false,
})

// Anti-brute force limiter for authentication endpoints (login & register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
})

// General API rate limiter for public endpoints
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests. Please slow down your activity.',
  },
})

// Strict trade order rate limiter (prevent rapid-fire automated bot clicks)
const tradeOrderLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 10, // max 10 trade orders per 10 seconds per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Trade orders submitted too quickly. Please pause briefly before your next order.',
  },
})

// Input sanitization to prevent NoSQL injection (e.g., $gt, $where, or object pollution)
function sanitizeInputs(req, _res, next) {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key]
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key])
      } else if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim()
      }
    }
    return obj
  }

  if (req.body) sanitize(req.body)
  if (req.query) sanitize(req.query)
  if (req.params) sanitize(req.params)
  next()
}

module.exports = {
  securityHeaders,
  authLimiter,
  generalApiLimiter,
  tradeOrderLimiter,
  sanitizeInputs,
}
