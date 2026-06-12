const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['ticket_created', 'ticket_assigned', 'ticket_status_changed', 'ticket_resolved', 'ticket_message', 'sla_warning', 'system'],
    required: true,
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    default: null,
  },
  ticketRef: String, // human-readable ticket ID like TKT-...
  isRead: {
    type: Boolean,
    default: false,
  },
  link: String,
}, { timestamps: true });

// Index for fast unread queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);