import axios from 'axios'

// AuthContext already sets axios.defaults.headers.common['Authorization']
// and all backend routes are reached through the Vite proxy at /api, so
// these just call relative paths and unwrap response data.

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
}

export const portfolioApi = {
  get: () => axios.get('/api/portfolio').then((r) => r.data),
  buy: (symbol, quantity) => axios.post('/api/portfolio/buy', { symbol, quantity }).then((r) => r.data),
  sell: (symbol, quantity) => axios.post('/api/portfolio/sell', { symbol, quantity }).then((r) => r.data),
  transactions: () => axios.get('/api/portfolio/transactions').then((r) => r.data.transactions),
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
