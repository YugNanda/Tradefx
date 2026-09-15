const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    side: { type: String, enum: ['BUY', 'SELL', 'SHORT', 'COVER', 'CLOSE'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // execution price at time of trade (in assetCurrency)
    total: { type: Number, required: true }, // quantity * price (in assetCurrency)
    assetCurrency: { type: String, default: 'INR' },
    baseCurrency: { type: String, default: 'INR' },
    exchangeRate: { type: Number, default: 1 }, // conversion multiplier: 1 assetCurrency = exchangeRate baseCurrency
    costInBaseCurrency: { type: Number, required: true }, // (total * exchangeRate) + fee
    fee: { type: Number, default: 0 }, // simulated brokerage fee (0.05%)
    realizedPnl: { type: Number, default: 0 }, // only set on SELL (in baseCurrency)
    orderType: { type: String, enum: ['MARKET', 'LIMIT'], default: 'MARKET' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Transaction', transactionSchema)
