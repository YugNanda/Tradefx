const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // execution price at time of trade
    total: { type: Number, required: true }, // quantity * price
    realizedPnl: { type: Number, default: 0 }, // only set on SELL
  },
  { timestamps: true }
)

module.exports = mongoose.model('Transaction', transactionSchema)
