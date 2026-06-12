require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Notification = require('./models/Notification');

const connectDB = require('./config/database');

const seed = async () => {
  await connectDB();

  console.log('🌱 Seeding database...');

  // Clear existing
  await Promise.all([User.deleteMany(), Ticket.deleteMany(), Notification.deleteMany()]);

  // Create users
  const adminUser = await User.create({
    name: 'Admin User', email: 'admin@support.com', password: 'admin123', role: 'admin',
  });
  const agent1 = await User.create({
    name: 'Sarah Mitchell', email: 'sarah@support.com', password: 'agent123', role: 'agent', department: 'Technical Support',
  });
  const agent2 = await User.create({
    name: 'James Chen', email: 'james@support.com', password: 'agent123', role: 'agent', department: 'Billing',
  });
  const customer1 = await User.create({
    name: 'Alice Johnson', email: 'alice@example.com', password: 'customer123', role: 'customer',
  });
  const customer2 = await User.create({
    name: 'Bob Williams', email: 'bob@example.com', password: 'customer123', role: 'customer',
  });

  // Create tickets
  const t1 = await Ticket.create({
    title: 'Cannot login to my account',
    description: 'I have been trying to login for the past 2 hours but keep getting an error saying my credentials are invalid. I recently changed my password but the new one is not working.',
    category: 'Account Issue', priority: 'High', status: 'In Progress',
    customerId: customer1._id, customerName: customer1.name,
    assignedAgent: agent1._id, agentName: agent1.name,
    aiAnalysis: { suggestedCategory: 'Account Issue', suggestedPriority: 'High', sentiment: 'Negative', confidence: 0.92 },
    isEditable: false,
  });

  const t2 = await Ticket.create({
    title: 'Double charged for subscription',
    description: 'I was charged twice for my monthly subscription on the same day. Please refund the duplicate charge as soon as possible.',
    category: 'Billing Issue', priority: 'Critical', status: 'Open',
    customerId: customer2._id, customerName: customer2.name,
    aiAnalysis: { suggestedCategory: 'Billing Issue', suggestedPriority: 'Critical', sentiment: 'Negative', confidence: 0.95 },
  });

  const t3 = await Ticket.create({
    title: 'How to export data as CSV?',
    description: 'I would like to know how to export my data in CSV format for reporting purposes.',
    category: 'General Inquiry', priority: 'Low', status: 'Resolved',
    customerId: customer1._id, customerName: customer1.name,
    assignedAgent: agent2._id, agentName: agent2.name,
    resolvedAt: new Date(), isEditable: false,
    aiAnalysis: { suggestedCategory: 'General Inquiry', suggestedPriority: 'Low', sentiment: 'Neutral', confidence: 0.88 },
    satisfactionRating: 5,
  });

  // Add notifications
  await Notification.create([
    { userId: adminUser._id, message: `New ticket #${t1.ticketId}: "Cannot login to my account"`, type: 'ticket_created', ticketId: t1._id, ticketRef: t1.ticketId },
    { userId: adminUser._id, message: `New ticket #${t2.ticketId}: "Double charged for subscription"`, type: 'ticket_created', ticketId: t2._id, ticketRef: t2.ticketId },
    { userId: agent1._id, message: `Ticket #${t1.ticketId} assigned to you`, type: 'ticket_assigned', ticketId: t1._id, ticketRef: t1.ticketId },
    { userId: customer1._id, message: `Your ticket #${t1.ticketId} has been assigned`, type: 'ticket_assigned', ticketId: t1._id, ticketRef: t1.ticketId },
  ]);

  console.log(`
✅ Seed complete! Demo accounts:

  🔑 Admin:    admin@support.com   / admin123
  🔑 Agent:    sarah@support.com   / agent123
  🔑 Agent:    james@support.com   / agent123
  🔑 Customer: alice@example.com   / customer123
  🔑 Customer: bob@example.com     / customer123
  `);

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});