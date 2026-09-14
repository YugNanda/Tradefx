require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const connectDB = require('./config/db')
const priceScheduler = require('./jobs/priceScheduler')

const app = express()
const server = http.createServer(app)

const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL || 'https://your-tradex-frontend.vercel.app']
    : ['http://localhost:5173', 'http://127.0.0.1:5173']

// ─── Socket.io ────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
})
app.set('io', io)

// ─── Connect DB ───────────────────────────────────────────────────
connectDB()

// ─── Middleware ───────────────────────────────────────────────────
const { securityHeaders, sanitizeInputs, generalApiLimiter } = require('./middleware/security')

app.use(securityHeaders)
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(sanitizeInputs)
app.use('/api', generalApiLimiter)

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`)
    next()
  })
}

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
app.use('/api/market', require('./routes/market'))
app.use('/api/portfolio', require('./routes/portfolio'))
app.use('/api/watchlist', require('./routes/watchlist'))
app.use('/api/alerts', require('./routes/alerts'))
app.use('/api/news', require('./routes/news'))
app.use('/api/signals', require('./routes/signals'))
app.use('/api/analytics', require('./routes/analytics'))
app.use('/api/leaderboard', require('./routes/leaderboard'))
app.use('/api/notifications', require('./routes/notifications'))

app.get('/api/health', (_req, res) => {
  const av = require('./services/aiProviders/alphaVantageProvider')
  const nd = require('./services/aiProviders/newsdataProvider')
  const avBudget = av.getBudget()
  const ndBudget = nd.getBudget()
  const mongoose = require('mongoose')

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      connected: mongoose.connection.readyState === 1,
      name: mongoose.connection.name,
    },
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    priceProvider: 'alphavantage (with synthetic fallback)',
    newsProvider: 'newsdata.io',
    alphavantage: {
      usedToday: avBudget.used,
      dailyLimit: Number(process.env.AV_DAILY_LIMIT || 23),
      limitReached: av.isLimitReached(),
    },
    newsdata: {
      usedToday: ndBudget.used,
      dailyLimit: Number(process.env.ND_DAILY_LIMIT || 180),
      limitReached: nd.isLimitReached(),
    },
    trackedSymbols: Array.from(priceScheduler.activeSymbols),
  })
})

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

// ─── Socket.io events ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)

  socket.on('join:market', (symbols) => {
    symbols?.forEach((sym) => {
      socket.join(`market:${sym}`)
      priceScheduler.trackSymbol(sym)
    })
  })

  socket.on('leave:market', (symbols) => {
    symbols?.forEach((sym) => {
      socket.leave(`market:${sym}`)
      priceScheduler.untrackSymbol(sym)
    })
  })

  socket.on('join:user', (userId) => {
    if (userId) socket.join(`user:${userId}`)
  })

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`)
  })
})

// ─── Real-time price engine (Phase 3) ──────────────────────────────
// Prices sourced from Alpha Vantage (real market data, 25 calls/day free).
// News sourced from Newsdata.io (200 calls/day free).
// See services/marketDataService.js and jobs/priceScheduler.js.
priceScheduler.start(io)

// ─── Start server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 TradeX Server running on port ${PORT}`)
  console.log(`📡 WebSocket ready`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
})
