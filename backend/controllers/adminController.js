const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { asyncHandler } = require('../middleware/error');

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalTickets, openTickets, inProgressTickets, pendingTickets,
    resolvedTickets, closedTickets, criticalTickets,
    totalUsers, totalAgents, totalCustomers,
  ] = await Promise.all([
    Ticket.countDocuments(),
    Ticket.countDocuments({ status: 'Open' }),
    Ticket.countDocuments({ status: 'In Progress' }),
    Ticket.countDocuments({ status: 'Pending' }),
    Ticket.countDocuments({ status: 'Resolved' }),
    Ticket.countDocuments({ status: 'Closed' }),
    Ticket.countDocuments({ priority: 'Critical', status: { $nin: ['Resolved', 'Closed'] } }),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'agent', isActive: true }),
    User.countDocuments({ role: 'customer', isActive: true }),
  ]);

  // SLA breached tickets
  const slaBreached = await Ticket.countDocuments({
    'sla.dueDate': { $lt: new Date() },
    status: { $nin: ['Resolved', 'Closed'] },
  });

  // Average resolution time (in hours)
  const resolvedWithTime = await Ticket.find({
    status: { $in: ['Resolved', 'Closed'] },
    resolvedAt: { $exists: true },
  }, 'createdAt resolvedAt');
  const avgResolutionHours = resolvedWithTime.length > 0
    ? resolvedWithTime.reduce((acc, t) => acc + (t.resolvedAt - t.createdAt) / 3600000, 0) / resolvedWithTime.length
    : 0;

  // Customer satisfaction
  const ratedTickets = await Ticket.find({ satisfactionRating: { $ne: null } }, 'satisfactionRating');
  const avgSatisfaction = ratedTickets.length > 0
    ? ratedTickets.reduce((acc, t) => acc + t.satisfactionRating, 0) / ratedTickets.length
    : 0;

  // Tickets by category
  const ticketsByCategory = await Ticket.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Tickets by priority
  const ticketsByPriority = await Ticket.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  // Tickets per day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);
  const ticketTrends = await Ticket.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Sentiment distribution
  const sentimentDist = await Ticket.aggregate([
    { $match: { 'aiAnalysis.sentiment': { $exists: true } } },
    { $group: { _id: '$aiAnalysis.sentiment', count: { $sum: 1 } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      tickets: { totalTickets, openTickets, inProgressTickets, pendingTickets, resolvedTickets, closedTickets, criticalTickets },
      users: { totalUsers, totalAgents, totalCustomers },
      sla: { slaBreached },
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
      ticketsByCategory,
      ticketsByPriority,
      ticketTrends,
      sentimentDist,
    },
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(query);
  const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
  res.status(200).json({ success: true, count: users.length, total, data: users });
});

// @desc    Update user (role, active status)
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = asyncHandler(async (req, res) => {
  const { role, isActive, department } = req.body;
  const update = {};
  if (role) update.role = role;
  if (isActive !== undefined) update.isActive = isActive;
  if (department) update.department = department;

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.status(200).json({ success: true, data: user });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.status(200).json({ success: true, message: 'User deleted' });
});

// @desc    Get agent performance metrics
// @route   GET /api/admin/agent-performance
// @access  Private (Admin)
const getAgentPerformance = asyncHandler(async (req, res) => {
  const agents = await User.find({ role: 'agent', isActive: true });

  const performance = await Promise.all(agents.map(async (agent) => {
    const [assigned, resolved, avgRating] = await Promise.all([
      Ticket.countDocuments({ assignedAgent: agent._id }),
      Ticket.countDocuments({ assignedAgent: agent._id, status: { $in: ['Resolved', 'Closed'] } }),
      Ticket.aggregate([
        { $match: { assignedAgent: agent._id, satisfactionRating: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$satisfactionRating' } } },
      ]),
    ]);

    return {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      department: agent.department,
      assignedTickets: assigned,
      resolvedTickets: resolved,
      resolutionRate: assigned > 0 ? Math.round((resolved / assigned) * 100) : 0,
      avgSatisfaction: avgRating[0] ? Math.round(avgRating[0].avg * 10) / 10 : null,
    };
  }));

  res.status(200).json({ success: true, data: performance });
});

// @desc    Get SLA report
// @route   GET /api/admin/sla-report
// @access  Private (Admin)
const getSLAReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() + 4 * 3600000); // 4 hours away

  const overdueTickets = await Ticket.find({
    'sla.dueDate': { $lt: now },
    status: { $nin: ['Resolved', 'Closed'] },
  }).populate('customerId', 'name').populate('assignedAgent', 'name').sort({ 'sla.dueDate': 1 });

  const warningTickets = await Ticket.find({
    'sla.dueDate': { $gte: now, $lte: warningThreshold },
    status: { $nin: ['Resolved', 'Closed'] },
  }).populate('customerId', 'name').populate('assignedAgent', 'name').sort({ 'sla.dueDate': 1 });

  res.status(200).json({
    success: true,
    data: { overdueTickets, warningTickets, overdueCount: overdueTickets.length, warningCount: warningTickets.length },
  });
});

module.exports = { getDashboardStats, getAllUsers, updateUser, deleteUser, getAgentPerformance, getSLAReport };