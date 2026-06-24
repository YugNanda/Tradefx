# TradeX — Phase 3

A professional trading dashboard with real market data.

- **Prices** → Alpha Vantage (25 calls/day free)
- **News** → Newsdata.io (200 calls/day free)
- **Signals** → Rule-based (SMA crossover, no AI calls)

---

## Local Development

### 1. Clone & install

```bash
# Install server deps
cd tradex/server && npm install

# Install client deps
cd tradex/client && npm install
```

### 2. Configure environment

**Server** — edit `server/.env`:
```
MONGO_URI=mongodb://localhost:27017/tradex   # or your MongoDB Atlas URI
JWT_SECRET=some_long_random_string
ALPHAVANTAGE_API_KEY=your_key_here           # alphavantage.co → free API key
NEWSDATA_API_KEY=your_key_here               # newsdata.io → free API key
```

**Client** — `client/.env` is already set up (leave `VITE_API_URL` empty for dev).

### 3. Run

```bash
# Terminal 1 — backend
cd tradex/server && npm run dev

# Terminal 2 — frontend
cd tradex/client && npm run dev
```

Open http://localhost:5173

---

## Production Deployment

### Step 1 — Deploy backend to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your repo
4. Settings:
   - **Root Directory:** `tradex/server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
5. Add Environment Variables (click "Add from .env" or paste each):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random secret |
| `JWT_EXPIRES_IN` | `7d` |
| `ALPHAVANTAGE_API_KEY` | Your Alpha Vantage key |
| `NEWSDATA_API_KEY` | Your Newsdata.io key |
| `CLIENT_URL` | Your Vercel URL (fill in after Step 2) |
| `PRICE_STALE_MS` | `10800000` |
| `PRICE_POLL_INTERVAL_MS` | `10800000` |
| `AV_DAILY_LIMIT` | `23` |
| `NEWS_CACHE_HOURS` | `6` |
| `ND_DAILY_LIMIT` | `180` |

6. Deploy → copy the URL (e.g. `https://tradex-server.onrender.com`)

---

### Step 2 — Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import your repo
2. Settings:
   - **Root Directory:** `tradex/client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Your Render URL (e.g. `https://tradex-server.onrender.com`) |

4. Deploy → copy your Vercel URL

---

### Step 3 — Link them together

1. Go back to **Render** → your service → Environment
2. Set `CLIENT_URL` = your Vercel URL (e.g. `https://tradex.vercel.app`)
3. Render will auto-redeploy

---

### Step 4 (Optional) — Prevent Render cold starts

Render free tier sleeps after 15 min of inactivity (30s cold start on next request).

Fix: set up a free monitor at [uptimerobot.com](https://uptimerobot.com) to ping  
`https://tradex-server.onrender.com/api/health` every **10 minutes**.

---

## API Keys (Free Tier)

| Service | Sign Up | Free Limit |
|---------|---------|------------|
| [Alpha Vantage](https://alphavantage.co/support/#api-key) | No credit card | 25 req/day |
| [Newsdata.io](https://newsdata.io) | No credit card | 200 req/day |

---

## Budget Monitoring

Check daily API usage at any time:

```
GET /api/health
```

Returns:
```json
{
  "alphavantage": { "usedToday": 3, "dailyLimit": 23, "limitReached": false },
  "newsdata":     { "usedToday": 7, "dailyLimit": 180, "limitReached": false }
}
```
