const Notification = require('../models/Notification');

/**
 * Create a notification for one or more users
 */
const createNotification = async ({ userId, userIds, message, type, ticketId, ticketRef, link }) => {
  try {
    const recipients = userIds || (userId ? [userId] : []);
    if (recipients.length === 0) return;

    const docs = recipients.map(uid => ({
      userId: uid,
      message,
      type,
      ticketId: ticketId || null,
      ticketRef: ticketRef || null,
      link: link || null,
      isRead: false,
    }));

    await Notification.insertMany(docs);
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
};

module.exports = { createNotification };