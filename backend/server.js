require('dotenv').config();
process.env.JWT_SECRET = (process.env.JWT_SECRET || '').trim() || 'supportdesk_default_jwt_secret_2026';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/error');
const User = require('./models/User');

const seedDefaultAdmin = async () => {
  const adminEmail = 'admin@support.com';
  const adminPassword = 'admin123';

  const adminUser = await User.findOne({ email: adminEmail }).select('+password');

  if (!adminUser) {
    console.log('🌱 No admin account found. Seeding default admin account...');
    await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isActive: true,
    });
    console.log('✅ Default admin seeded: admin@support.com / admin123');
    return;
  }

  if (!adminUser.isActive) {
    adminUser.isActive = true;
  }

  if (adminUser.role !== 'admin') {
    adminUser.role = 'admin';
  }

  const hasDefaultPassword = await adminUser.matchPassword(adminPassword);
  if (!hasDefaultPassword) {
    console.log('🔐 Resetting admin password to default for deployment recovery.');
    adminUser.password = adminPassword;
  }

  await adminUser.save();
  console.log('✅ Admin account verified: admin@support.com / admin123');
};

const createApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://ai-customer-support-azdn.onrender.com/api',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging (dev only)
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // Static files — serve uploads
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // API Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api', require('./routes/auth'));
  app.use('/api/tickets', require('./routes/ticket'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/notifications', require('./routes/notification'));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  app.get('/', (req, res) => {
    res.send('Backend is running...');
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};

const startServer = async () => {
  await connectDB();
  await seedDefaultAdmin();

  const app = createApp();
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
  });
};

startServer().catch((err) => {
  console.error('Server initialization error:', err);
  process.exit(1);
});