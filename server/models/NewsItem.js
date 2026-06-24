const mongoose = require('mongoose')

const newsItemSchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, index: true }, // symbol, or 'GENERAL'
    headline: String,
    summary: String,
    sourceName: String,
    url: String,
    publishedAt: Date,
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// Auto-expire cached news after 6 hours (matches NEWS_CACHE_HOURS default in newsService).
newsItemSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 21600 })

module.exports = mongoose.model('NewsItem', newsItemSchema)
