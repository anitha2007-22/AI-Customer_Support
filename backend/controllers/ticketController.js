const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');
const { analyzeTicket, generateResponseSuggestion } = require('../utils/aiService');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private (Customer, Agent, Admin)
const createTicket = asyncHandler(async (req, res) => {
  const { title, description, category, priority } = req.body;

  // AI analysis
  const aiAnalysis = await analyzeTicket(title, description);

  const ticketData = {
    title,
    description,
    category: category || aiAnalysis.suggestedCategory,
    priority: priority || aiAnalysis.suggestedPriority,
    customerId: req.user._id,
    customerName: req.user.name,
    aiAnalysis,
  };

  // Handle file attachments
  if (req.files && req.files.length > 0) {
    ticketData.attachments = req.files.map(f => `/uploads/${f.filename}`);
  }

  const ticket = await Ticket.create(ticketData);

  // Notify all admins and agents
  const adminsAndAgents = await User.find({ role: { $in: ['admin', 'agent'] }, isActive: true }, '_id');
  await createNotification({
    userIds: adminsAndAgents.map(u => u._id),
    message: `New ticket #${ticket.ticketId}: "${ticket.title}"`,
    type: 'ticket_created',
    ticketId: ticket._id,
    ticketRef: ticket.ticketId,
    link: `/ticket/${ticket._id}`,
  });

  res.status(201).json({ success: true, data: ticket });
});

// @desc    Get tickets (role-aware)
// @route   GET /api/tickets
// @access  Private
const getTickets = asyncHandler(async (req, res) => {
  const { status, priority, category, search, startDate, endDate, page = 1, limit = 20 } = req.query;

  let query = {};

  // Role-based scoping
  if (req.user.role === 'customer') {
    query.customerId = req.user._id;
  } else if (req.user.role === 'agent') {
    query.assignedAgent = req.user._id;
  }
  // admin sees all

  // Filters
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Search
  if (search) {
    query.$or = [
      { ticketId: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Ticket.countDocuments(query);
  const tickets = await Ticket.find(query)
    .populate('customerId', 'name email profileImage')
    .populate('assignedAgent', 'name email profileImage')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: tickets.length,
    total,
    pages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: tickets,
  });
});

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
const getTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('customerId', 'name email profileImage')
    .populate('assignedAgent', 'name email profileImage')
    .populate('messages.sender', 'name role profileImage');

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  // Access control
  if (req.user.role === 'customer' && ticket.customerId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  if (req.user.role === 'agent' && ticket.assignedAgent && ticket.assignedAgent._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  res.status(200).json({ success: true, data: ticket });
});

// @desc    Update ticket (customer can edit before assignment)
// @route   PUT /api/tickets/:id
// @access  Private
const updateTicket = asyncHandler(async (req, res) => {
  let ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  // Customers can only update their own unassigned tickets
  if (req.user.role === 'customer') {
    if (ticket.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!ticket.isEditable) {
      return res.status(400).json({ success: false, message: 'Ticket cannot be edited after assignment' });
    }
  }

  const { title, description, category, priority, status } = req.body;
  const update = {};

  if (req.user.role === 'customer') {
    if (title) update.title = title;
    if (description) update.description = description;
  } else {
    // Agents and admins can update more fields
    if (title) update.title = title;
    if (description) update.description = description;
    if (category) update.category = category;
    if (priority) update.priority = priority;
    if (status) {
      update.status = status;
      if (status === 'Resolved') { update.resolvedAt = new Date(); update['sla.resolvedAt'] = new Date(); }
      if (status === 'Closed') update.closedAt = new Date();
    }
  }

  ticket = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

  // Notify customer of status change
  if (update.status) {
    await createNotification({
      userId: ticket.customerId,
      message: `Your ticket #${ticket.ticketId} status changed to: ${update.status}`,
      type: 'ticket_status_changed',
      ticketId: ticket._id,
      ticketRef: ticket.ticketId,
      link: `/ticket/${ticket._id}`,
    });
  }

  res.status(200).json({ success: true, data: ticket });
});

// @desc    Add message to ticket
// @route   POST /api/tickets/:id/messages
// @access  Private
const addMessage = asyncHandler(async (req, res) => {
  const { content, isInternal } = req.body;

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  // Customers cannot add internal notes
  const internal = req.user.role === 'customer' ? false : (isInternal || false);

  const message = {
    sender: req.user._id,
    senderName: req.user.name,
    senderRole: req.user.role,
    content,
    isInternal: internal,
    attachments: req.files ? req.files.map(f => `/uploads/${f.filename}`) : [],
  };

  ticket.messages.push(message);

  // Auto-update status when customer replies
  if (req.user.role === 'customer' && ticket.status === 'Pending') {
    ticket.status = 'Open';
  }
  // Auto-set to pending when agent replies (waiting for customer)
  if ((req.user.role === 'agent' || req.user.role === 'admin') && ticket.status === 'Open') {
    ticket.status = 'In Progress';
  }

  await ticket.save();

  // Notify relevant parties (skip internal notes for customer)
  if (!internal) {
    const notifyUserId = req.user.role === 'customer' ? ticket.assignedAgent : ticket.customerId;
    if (notifyUserId) {
      await createNotification({
        userId: notifyUserId,
        message: `New message on ticket #${ticket.ticketId} from ${req.user.name}`,
        type: 'ticket_message',
        ticketId: ticket._id,
        ticketRef: ticket.ticketId,
        link: `/ticket/${ticket._id}`,
      });
    }
  }

  res.status(201).json({ success: true, data: ticket });
});

// @desc    Assign ticket to agent
// @route   PUT /api/tickets/:id/assign
// @access  Private (Admin)
const assignTicket = asyncHandler(async (req, res) => {
  const { agentId } = req.body;

  const agent = await User.findById(agentId);
  if (!agent || agent.role !== 'agent') {
    return res.status(400).json({ success: false, message: 'Invalid agent' });
  }

  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    { assignedAgent: agentId, agentName: agent.name, status: 'In Progress', isEditable: false },
    { new: true }
  );

  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  // Add ticket to agent's list
  await User.findByIdAndUpdate(agentId, { $addToSet: { assignedTickets: ticket._id } });

  // Notify agent and customer
  await createNotification({
    userId: agentId,
    message: `Ticket #${ticket.ticketId} assigned to you`,
    type: 'ticket_assigned',
    ticketId: ticket._id,
    ticketRef: ticket.ticketId,
    link: `/ticket/${ticket._id}`,
  });
  await createNotification({
    userId: ticket.customerId,
    message: `Your ticket #${ticket.ticketId} has been assigned to ${agent.name}`,
    type: 'ticket_assigned',
    ticketId: ticket._id,
    ticketRef: ticket.ticketId,
    link: `/ticket/${ticket._id}`,
  });

  res.status(200).json({ success: true, data: ticket });
});

// @desc    Get AI response suggestion for agent
// @route   GET /api/tickets/:id/ai-suggestion
// @access  Private (Agent, Admin)
const getAISuggestion = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  const suggestion = await generateResponseSuggestion(ticket, ticket.messages);
  res.status(200).json({ success: true, data: { suggestion } });
});

// @desc    Submit satisfaction rating
// @route   PUT /api/tickets/:id/rate
// @access  Private (Customer)
const rateTicket = asyncHandler(async (req, res) => {
  const { rating } = req.body;
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.customerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  ticket.satisfactionRating = rating;
  await ticket.save();
  res.status(200).json({ success: true, data: ticket });
});

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private (Admin)
const deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findByIdAndDelete(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  res.status(200).json({ success: true, message: 'Ticket deleted' });
});

module.exports = {
  createTicket, getTickets, getTicket, updateTicket,
  addMessage, assignTicket, getAISuggestion, rateTicket, deleteTicket,
};