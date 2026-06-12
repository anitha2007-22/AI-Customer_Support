const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['customer', 'agent', 'admin'],
    default: 'customer',
  },
  profileImage: {
    type: String,
    default: null,
  },
  department: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  performanceScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  assignedTickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
  }],
  lastLogin: {
    type: Date,
    default: null,
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    browser: { type: Boolean, default: true },
  },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);