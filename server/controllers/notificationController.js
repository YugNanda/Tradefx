const Notification = require('../models/Notification')

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)

    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false })
    res.json({ notifications, unreadCount })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params
    if (id === 'all') {
      await Notification.updateMany({ user: req.user.id, read: false }, { read: true })
    } else {
      await Notification.findOneAndUpdate({ _id: id, user: req.user.id }, { read: true })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id })
    res.json({ success: true, message: 'All notifications cleared' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
