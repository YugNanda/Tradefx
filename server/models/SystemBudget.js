const mongoose = require('mongoose')

const systemBudgetSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      unique: true, // e.g. 'alphavantage', 'newsdata'
      enum: ['alphavantage', 'newsdata'],
    },
    date: {
      type: String,
      required: true, // Format: YYYY-MM-DD
    },
    usedToday: {
      type: Number,
      default: 0,
    },
    dailyLimit: {
      type: Number,
      required: true,
    },
    lastCalledAt: Date,
  },
  { timestamps: true }
)

module.exports = mongoose.model('SystemBudget', systemBudgetSchema)
