const mongoose = require('mongoose')

const snapshotSchema = new mongoose.Schema(
  {
    price: Number,
    asOf: Date,
  },
  { _id: false }
)

const priceCacheSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, uppercase: true, index: true },
  name: String,
  exchange: String,
  assetClass: String,
  currency: String,
  price: Number,
  changePercent: Number,
  dayHigh: Number,
  dayLow: Number,
  asOf: Date,
  provider: String, // 'alphavantage'
  sourceName: String, // 'Alpha Vantage'
  approximate: { type: Boolean, default: false }, // false — AV is a real market data feed
  staleSince: Date, // set when a refresh fails, so consumers can warn the user
  // Rolling history used for charts + AI signal generation. Capped client-side.
  history: { type: [snapshotSchema], default: [] },
})

priceCacheSchema.methods.pushHistory = function (cap = 200) {
  this.history.push({ price: this.price, asOf: this.asOf })
  if (this.history.length > cap) {
    this.history = this.history.slice(this.history.length - cap)
  }
}

module.exports = mongoose.model('PriceCache', priceCacheSchema)
