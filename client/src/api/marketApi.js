import axios from 'axios'

// AuthContext sets axios.defaults.headers.common['Authorization']
// and backend routes are proxied via Vite (/api -> localhost:5000)

export const marketApi = {
  search: (q, assetClass) =>
    axios.get('/api/market/search', { params: { q, assetClass } }).then((r) => r.data.results),
  listSymbols: (assetClass) =>
    axios.get('/api/market/symbols', { params: { assetClass } }).then((r) => r.data.symbols),
  getQuote: (symbol) =>
    axios.get(`/api/market/quote/${symbol}`).then((r) => r.data.quote),
  getQuotes: (symbols) =>
    axios.get('/api/market/quotes', { params: { symbols: symbols.join(',') } }).then((r) => r.data.quotes),
  getHistory: (symbol) =>
    axios.get(`/api/market/history/${symbol}`).then((r) => r.data),
  getOhlc: (symbol, timeframe = '1D') =>
    axios.get(`/api/market/ohlc/${symbol}`, { params: { timeframe } }).then((r) => r.data),
}

export const portfolioApi = {
  get: () => axios.get('/api/portfolio').then((r) => r.data),
  buy: (symbol, quantity, orderType = 'MARKET') =>
    axios.post('/api/portfolio/buy', { symbol, quantity, orderType }).then((r) => r.data),
  sell: (symbol, quantity, orderType = 'MARKET') =>
    axios.post('/api/portfolio/sell', { symbol, quantity, orderType }).then((r) => r.data),
  transactions: () => axios.get('/api/portfolio/transactions').then((r) => r.data.transactions),
}

export const analyticsApi = {
  get: () => axios.get('/api/analytics/summary').then((r) => r.data),
  exportCsv: () =>
    axios
      .get('/api/analytics/export/csv', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `tradex_ledger_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
      }),
  resetBalance: () => axios.post('/api/analytics/reset-balance').then((r) => r.data),
}

export const leaderboardApi = {
  get: () => axios.get('/api/leaderboard').then((r) => r.data.leaderboard),
}

export const notificationsApi = {
  get: () => axios.get('/api/notifications').then((r) => r.data),
  markRead: (id) => axios.patch(`/api/notifications/read/${id}`).then((r) => r.data),
  clearAll: () => axios.delete('/api/notifications/clear').then((r) => r.data),
}

export const watchlistApi = {
  get: () => axios.get('/api/watchlist').then((r) => r.data.watchlist),
  add: (symbol) => axios.post('/api/watchlist', { symbol }).then((r) => r.data.watchlist),
  remove: (symbol) => axios.delete(`/api/watchlist/${symbol}`).then((r) => r.data.watchlist),
}

export const alertsApi = {
  get: () => axios.get('/api/alerts').then((r) => r.data.alerts),
  create: (symbol, condition, targetPrice) =>
    axios.post('/api/alerts', { symbol, condition, targetPrice }).then((r) => r.data.alert),
  remove: (id) => axios.delete(`/api/alerts/${id}`),
}

export const newsApi = {
  get: (symbol) => axios.get('/api/news', { params: { symbol } }).then((r) => r.data.news),
}

export const signalsApi = {
  get: (symbol) => axios.get(`/api/signals/${symbol}`).then((r) => r.data.signal),
}
