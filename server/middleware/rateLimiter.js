// Lightweight in-memory rate limiter (no extra dependency). Good enough for
// a single-instance deployment; swap for express-rate-limit + Redis if you
// scale to multiple server instances.
function rateLimiter({ windowMs = 60000, max = 30 } = {}) {
  const hits = new Map() // key -> [timestamps]

  return (req, res, next) => {
    const key = req.user?.id || req.ip
    const now = Date.now()
    const timestamps = (hits.get(key) || []).filter((t) => now - t < windowMs)

    if (timestamps.length >= max) {
      return res.status(429).json({ message: 'Too many requests — please slow down.' })
    }

    timestamps.push(now)
    hits.set(key, timestamps)
    next()
  }
}

module.exports = rateLimiter
