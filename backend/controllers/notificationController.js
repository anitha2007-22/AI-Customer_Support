const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  res.status(200).json({ success: true, unreadCount, data: notifications });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.status(200).json({ success: true, data: notification });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.status(200).json({ success: true, message: 'Notification deleted' });
});

module.exports = { getNotifications, markRead, markAllRead, deleteNotification };