// Currency conversion service. Normalizes asset currencies (USD, INR, JPY, EUR, GBP)
// into the user's portfolio base currency (INR or USD).

const rates = {
  USDINR: 83.50, // 1 USD = 83.50 INR
  EURUSD: 1.085, // 1 EUR = 1.085 USD
  GBPUSD: 1.272, // 1 GBP = 1.272 USD
  USDJPY: 154.5, // 1 USD = 154.5 JPY
}

function updateRate(pair, rate) {
  if (pair && rate && rate > 0) {
    rates[pair.toUpperCase()] = rate
  }
}

function getRate(fromCurrency, toCurrency) {
  const from = (fromCurrency || 'INR').toUpperCase()
  const to = (toCurrency || 'INR').toUpperCase()

  if (from === to) return 1

  // Direct USD -> INR
  if (from === 'USD' && to === 'INR') return rates.USDINR
  if (from === 'INR' && to === 'USD') return 1 / rates.USDINR

  // EUR -> USD / INR
  if (from === 'EUR' && to === 'USD') return rates.EURUSD
  if (from === 'EUR' && to === 'INR') return rates.EURUSD * rates.USDINR

  // GBP -> USD / INR
  if (from === 'GBP' && to === 'USD') return rates.GBPUSD
  if (from === 'GBP' && to === 'INR') return rates.GBPUSD * rates.USDINR

  // JPY -> USD / INR
  if (from === 'JPY' && to === 'USD') return 1 / rates.USDJPY
  if (from === 'JPY' && to === 'INR') return (1 / rates.USDJPY) * rates.USDINR

  // Default fallback
  return 1
}

function convert(amount, fromCurrency, toCurrency) {
  if (amount == null || isNaN(amount)) return 0
  const rate = getRate(fromCurrency, toCurrency)
  return amount * rate
}

module.exports = {
  convert,
  getRate,
  updateRate,
  getRates: () => ({ ...rates }),
}
