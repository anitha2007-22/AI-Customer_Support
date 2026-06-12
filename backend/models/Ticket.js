const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: String,
  senderRole: String,
  content: {
    type: String,
    required: true,
  },
  isInternal: {
    type: Boolean,
    default: false,
  },
  attachments: [String],
}, { timestamps: true });

const TicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  category: {
    type: String,
    enum: ['Technical Issue', 'Billing Issue', 'Account Issue', 'General Inquiry'],
    default: 'General Inquiry',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'],
    default: 'Open',
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerName: String,
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  agentName: String,
  attachments: [String],
  messages: [MessageSchema],
  // AI-generated fields
  aiAnalysis: {
    suggestedCategory: String,
    suggestedPriority: String,
    sentiment: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative'],
      default: 'Neutral',
    },
    suggestedResponse: String,
    routingRecommendation: String,
    confidence: Number,
  },
  // SLA tracking
  sla: {
    dueDate: Date,
    resolvedAt: Date,
    breached: { type: Boolean, default: false },
    warningIssued: { type: Boolean, default: false },
  },
  tags: [String],
  isEditable: {
    type: Boolean,
    default: true,
  },
  resolvedAt: Date,
  closedAt: Date,
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
}, { timestamps: true });

// Auto-generate ticket ID before saving
TicketSchema.pre('save', function (next) {
  if (!this.ticketId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.ticketId = `TKT-${timestamp}-${random}`;
  }
  // Lock editing once assigned
  if (this.assignedAgent && this.isEditable) {
    this.isEditable = false;
  }
  // Set SLA due date based on priority
  if (!this.sla.dueDate) {
    const hours = { Low: 72, Medium: 48, High: 24, Critical: 4 };
    const h = hours[this.priority] || 48;
    this.sla.dueDate = new Date(Date.now() + h * 3600000);
  }
  next();
});

module.exports = mongoose.model('Ticket', TicketSchema);