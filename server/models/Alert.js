const mongoose = require('mongoose')

const alertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    condition: { type: String, enum: ['above', 'below'], required: true },
    targetPrice: { type: Number, required: true },
    active: { type: Boolean, default: true },
    triggeredAt: Date,
  },
  { timestamps: true }
)

module.exports = mongoose.model('Alert', alertSchema)
