const newsService = require('../services/newsService')

exports.getNews = async (req, res) => {
  try {
    const { symbol } = req.query
    const news = await newsService.getNews(symbol)
    res.json({ news })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
