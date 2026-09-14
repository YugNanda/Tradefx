# TradeX — Institutional Trading & Financial Analytics Platform (Enterprise Edition)

A production-ready, institutional-grade financial analytics and virtual paper trading platform supporting multiple global asset classes (NSE, BSE, NYSE, Crypto, Forex).

## Key Features

- **Multi-Asset Live Market Data**: Real-time prices from Alpha Vantage with zero-downtime high-fidelity synthetic market simulation when quotas are reached.
- **Interactive Candlestick (OHLCV) Charts**: Multi-timeframe switching (`1D`, `1W`, `1M`, `1Y`) powered by ApexCharts.
- **Quantitative Technical Analysis**: Algorithmic signal engine computing real RSI (14-period), MACD (12, 26, 9), SMA 20/50 crossovers, and ATR-based Stop-Loss & Take-Profit targets.
- **Institutional Trading Terminal**: Market & Limit order execution with simulated brokerage fees (0.05%) and anti-race-condition atomic balance locking.
- **Multi-Currency Normalization**: Automatic real-time FX conversion (`USD/INR`) so international assets (BTC, AAPL) and domestic stocks (Reliance, Nifty50) are valued with mathematical precision.
- **Portfolio Analytics & Reporting**: Sharpe ratio, Win/Loss rate, Max Drawdown %, Asset allocation distribution, and 1-click **CSV Transaction Ledger Export**.
- **Global Trader Leaderboard**: Real-time competitive rankings by net worth and realized P&L.
- **Real-Time Price Alerts & Notification Center**: WebSockets-driven price alerts and persistent in-app notifications drawer.
- **Security Hardening**: `helmet` security headers, anti-brute-force rate limiting on auth endpoints, and NoSQL injection sanitization.

---

## Local Development

### 1. Clone & Install

```bash
# Install root, client, and server dependencies
npm run install:all
```

### 2. Configure Environment

**Server** (`server/.env`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/tradex   # or MongoDB Atlas connection string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
ALPHAVANTAGE_API_KEY=your_key_here           # alphavantage.co
NEWSDATA_API_KEY=your_key_here               # newsdata.io
```

**Client** (`client/.env`):
```env
# Leave empty for dev (Vite proxy forwards /api and /socket.io to localhost:5000)
VITE_API_URL=
```

### 3. Run

```bash
# Start backend and frontend concurrently
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new user account (rate-limited)
- `POST /api/auth/login` — Sign in and obtain JWT token (rate-limited)
- `GET /api/auth/me` — Retrieve current authenticated user profile

### Market Data (`/api/market`)
- `GET /api/market/quote/:symbol` — Live quote with daily change %
- `GET /api/market/quotes?symbols=AAPL,BTC,NIFTY50` — Batch quotes
- `GET /api/market/ohlc/:symbol?timeframe=1D` — Multi-timeframe OHLCV candles
- `GET /api/market/history/:symbol` — Accumulated tick history
- `GET /api/market/search?q=...` — Catalog search

### Trading & Portfolio (`/api/portfolio`)
- `GET /api/portfolio` — Enriched user holdings with live valuation and unrealized P&L
- `POST /api/portfolio/buy` — Execute market or limit buy order (atomic balance check)
- `POST /api/portfolio/sell` — Execute sell order with realized P&L computation
- `GET /api/portfolio/transactions` — Full transaction audit trail

### Quantitative Analytics (`/api/analytics`)
- `GET /api/analytics/summary` — Win rate, profit factor, Sharpe ratio, and asset allocation
- `GET /api/analytics/export/csv` — Download complete transaction ledger as CSV
- `POST /api/analytics/reset-balance` — Reset virtual balance to ₹100,000 baseline

### Quantitative Signals (`/api/signals`)
- `GET /api/signals/:symbol` — RSI, MACD, SMA 20/50, and Stop Loss/Take Profit recommendation

### Leaderboard (`/api/leaderboard`)
- `GET /api/leaderboard` — Top 20 ranked virtual traders

### Notifications (`/api/notifications`)
- `GET /api/notifications` — Notification drawer items with unread count
- `PATCH /api/notifications/read/:id` — Mark notification(s) as read
- `DELETE /api/notifications/clear` — Clear all notifications

### System Health (`/api/health`)
- `GET /api/health` — Uptime, database status, memory usage, and provider daily budgets

---

## Production Deployment

### 1. Backend (Render)
- **Root Directory**: `tradex/server`
- **Build Command**: `npm install`
- **Start Command**: `node index.js`
- **Environment Variables**: Set `MONGO_URI`, `JWT_SECRET`, `ALPHAVANTAGE_API_KEY`, `NEWSDATA_API_KEY`, `CLIENT_URL`.

### 2. Frontend (Vercel)
- **Root Directory**: `tradex/client`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: `VITE_API_URL` pointing to your Render backend URL.
