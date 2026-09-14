const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['ALERT_TRIGGERED', 'ORDER_EXECUTED', 'SYSTEM_INFO'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    data: { type: Object, default: {} },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Notification', notificationSchema)
