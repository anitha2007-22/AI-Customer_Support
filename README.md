# 🎫 SupportDesk — AI-Powered Customer Support Ticketing System

A production-quality, full-stack support ticketing platform powered by Google Gemini AI. Resolve tickets 10× faster with automatic categorization, sentiment analysis, and AI-generated responses.

---

Live Demo:
https://ai-customer-support-ticketing.lovable.app/

## 📸 Features

### 🤖 AI-Powered
- **Auto-categorization** — Technical, Billing, Account, or General
- **Priority detection** — Low / Medium / High / Critical
- **Sentiment analysis** — Positive / Neutral / Negative
- **Response suggestions** — Context-aware Gemini AI replies
- **Smart routing** — Recommended team/department

### 👥 Role-Based System
| Feature | Customer | Agent | Admin |
|---|---|---|---|
| Create tickets | ✅ | ✅ | ✅ |
| View own tickets | ✅ | — | ✅ |
| View assigned tickets | — | ✅ | ✅ |
| View all tickets | — | — | ✅ |
| Internal notes | — | ✅ | ✅ |
| Assign tickets | — | — | ✅ |
| Manage users | — | — | ✅ |
| Full analytics | — | — | ✅ |

### 📊 Analytics & SLA
- Real-time dashboard with Chart.js bar, line, and doughnut charts
- SLA tracking with automated overdue detection (4h / 24h / 48h / 72h)
- Agent performance leaderboard
- Ticket trend analysis (30-day rolling)
- Customer satisfaction ratings

### 🔔 Notifications
- Ticket created, assigned, status changed, resolved
- New message alerts
- SLA warning notifications
- Notification bell with unread count
- In-app notification dropdown panel

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| AI | Google Gemini Pro API |
| Charts | Chart.js 4.x |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Security | Helmet, CORS |

---

## 📁 Project Structure

```
support-ticketing/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Register, login, profile
│   │   ├── ticketController.js  # Full ticket CRUD + AI + messaging
│   │   ├── adminController.js   # Stats, users, analytics, SLA
│   │   └── notificationController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT protect + authorize
│   │   ├── error.js             # Global error handler + asyncHandler
│   │   └── upload.js            # Multer file upload
│   ├── models/
│   │   ├── User.js              # User schema (bcrypt, roles)
│   │   ├── Ticket.js            # Ticket schema (messages, SLA, AI)
│   │   └── Notification.js      # Notification schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tickets.js
│   │   ├── admin.js
│   │   └── notifications.js
│   ├── utils/
│   │   ├── aiService.js         # Google Gemini integration
│   │   ├── notificationHelper.js
│   │   ├── tokenHelper.js
│   │   └── seeder.js            # Demo data seeder
│   ├── uploads/                 # File storage
│   ├── server.js                # Express entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── css/
│   │   ├── main.css             # Full design system
│   │   └── landing.css          # Landing page styles
│   ├── js/
│   │   ├── app.js               # API client, auth, utilities, toast
│   │   └── sidebar.js           # Dynamic sidebar + topbar builder
│   └── pages/
│       ├── index.html           # Landing page
│       ├── login.html
│       ├── register.html
│       ├── admin-dashboard.html
│       ├── agent-dashboard.html
│       ├── customer-dashboard.html
│       ├── tickets.html         # Ticket list (search + filter)
│       ├── ticket-detail.html   # Full conversation + AI tools
│       ├── create-ticket.html   # Create with live AI preview
│       ├── notifications.html
│       ├── profile.html
│       ├── users.html           # Admin user management
│       ├── agents.html          # Agent leaderboard
│       ├── analytics.html       # Full analytics dashboard
│       ├── sla.html             # SLA monitoring
│       └── settings.html
│
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Google Gemini API key (optional — falls back to heuristics)

### 1. Clone / Navigate to the project
```bash
cd support-ticketing/backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/support_ticketing
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRE=7d
GEMINI_API_KEY=your_google_gemini_api_key
MAX_FILE_SIZE=10485760
FRONTEND_URL=http://localhost:5500
```

### 4. Seed demo data (optional but recommended)
```bash
npm run seed
```

This creates demo accounts:
| Role | Email | Password |
|---|---|---|
| Admin | admin@support.com | admin123 |
| Agent | sarah@support.com | agent123 |
| Agent | james@support.com | agent123 |
| Customer | alice@example.com | customer123 |
| Customer | bob@example.com | customer123 |

### 5. Start the backend
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

### 6. Serve the frontend

**Option A: VS Code Live Server**
Open `frontend/pages/index.html` → Right-click → Open with Live Server

**Option B: Python HTTP server**
```bash
cd support-ticketing
python3 -m http.server 5500
# Open http://localhost:5500/frontend/pages/index.html
```

**Option C: npx serve**
```bash
npx serve support-ticketing -l 5500
```

---

## 🔑 Getting a Gemini API Key

1. Go to https://aistudio.google.com/
2. Click "Get API key"
3. Create a new project and copy the key
4. Add to `.env` as `GEMINI_API_KEY=...`

> **Note:** If no key is provided, the system falls back to heuristic rule-based analysis that still categorizes, prioritizes, and analyses sentiment accurately.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Private |
| PUT | `/api/auth/profile` | Private |
| PUT | `/api/auth/change-password` | Private |

### Tickets
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/tickets` | Private |
| POST | `/api/tickets` | Private |
| GET | `/api/tickets/:id` | Private |
| PUT | `/api/tickets/:id` | Private |
| DELETE | `/api/tickets/:id` | Admin |
| POST | `/api/tickets/:id/messages` | Private |
| PUT | `/api/tickets/:id/assign` | Admin |
| GET | `/api/tickets/:id/ai-suggestion` | Agent/Admin |
| PUT | `/api/tickets/:id/rate` | Customer |

### Admin
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/admin/stats` | Admin |
| GET | `/api/admin/users` | Admin |
| PUT | `/api/admin/users/:id` | Admin |
| DELETE | `/api/admin/users/:id` | Admin |
| GET | `/api/admin/agent-performance` | Admin |
| GET | `/api/admin/sla-report` | Admin |

### Notifications
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/notifications` | Private |
| PUT | `/api/notifications/read-all` | Private |
| PUT | `/api/notifications/:id/read` | Private |
| DELETE | `/api/notifications/:id` | Private |

---

## 🗄️ Database Schemas

### Users
```
name, email, password (hashed), role (customer|agent|admin),
profileImage, department, isActive, performanceScore,
assignedTickets[], lastLogin, notificationPreferences
```

### Tickets
```
ticketId (auto TKT-XXXXX), title, description, category, priority, status,
customerId, customerName, assignedAgent, agentName,
attachments[], messages[{sender, content, isInternal, attachments}],
aiAnalysis{suggestedCategory, suggestedPriority, sentiment, routingRecommendation, suggestedResponse, confidence},
sla{dueDate, resolvedAt, breached}, satisfactionRating
```

### Notifications
```
userId, message, type, ticketId, ticketRef, isRead, link
```

---

## 🔒 Security Features

- JWT authentication with 7-day expiry
- bcrypt password hashing (12 rounds)
- Role-based route protection
- Helmet.js security headers
- CORS configuration
- File type validation
- File size limits (10MB)
- Input sanitization
- MongoDB injection prevention

---

## 📱 Responsive Design

- ✅ Mobile (< 480px)
- ✅ Tablet (480px – 768px)
- ✅ Desktop (> 768px)
- ✅ Dark / Light mode
- ✅ Sidebar collapses on mobile with overlay

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

Built with ❤️ using Node.js, MongoDB, and Google Gemini AI.
