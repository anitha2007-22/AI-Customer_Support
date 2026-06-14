/* =====================================================
   SupportDesk — Core JavaScript
   API client, authentication, UI utilities
   ===================================================== */

const LOCAL_API_BASE = 'https://ai-customer-support-backend-mbta.onrender.com/api';
const RENDER_API_BASE = 'https://ai-customer-support-backend-mbta.onrender.com/api';
const inferredApiBase = window.location.origin && window.location.origin !== 'null'
  ? `${window.location.origin}/api`
  : LOCAL_API_BASE;
const API_BASE = window.API_BASE
  || document.querySelector('meta[name="api-base"]')?.content
  || inferredApiBase;
const BACKEND_BASE = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
const backendAsset = (path) => `${BACKEND_BASE}${path.startsWith('/') ? path : `/${path}`}`;

/* ---- Local Storage Keys ---- */
const KEYS = {
  TOKEN: 'sd_token',
  USER: 'sd_user',
  THEME: 'sd_theme',
};

/* ======================================================
   AUTH HELPERS
====================================================== */
const Auth = {
  getToken: () => localStorage.getItem(KEYS.TOKEN),
  getUser: () => JSON.parse(localStorage.getItem(KEYS.USER) || 'null'),
  setSession: (token, user) => {
    localStorage.setItem(KEYS.TOKEN, token);
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.USER);
  },
  isLoggedIn: () => !!localStorage.getItem(KEYS.TOKEN),
  redirectIfNotLoggedIn: () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/pages/login.html';
      return true;
    }
    return false;
  },
  redirectIfLoggedIn: () => {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      Auth.redirectToDashboard(user?.role);
      return true;
    }
    return false;
  },
  redirectToDashboard: (role) => {
    const routes = {
      admin: '/pages/admin-dashboard.html',
      agent: '/pages/agent-dashboard.html',
      customer: '/pages/customer-dashboard.html',
    };
    window.location.href = routes[role] || routes.customer;
  },
};

/* ======================================================
   API CLIENT
====================================================== */
const API = {
  request: async (method, endpoint, data = null, isFormData = false) => {
    const token = Auth.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const config = { method, headers };
    if (data) config.body = isFormData ? data : JSON.stringify(data);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, config);
      const json = await res.json();
      if (res.status === 401 && !endpoint.includes('/auth/')) {
        Auth.clearSession();
        window.location.href = '/pages/login.html';
        return null;
      }
      return { ok: res.ok, status: res.status, data: json };
    } catch (err) {
      console.error('API Error:', err);
      return { ok: false, status: 0, data: { message: 'Network error. Please check your connection.' } };
    }
  },

  get: (endpoint) => API.request('GET', endpoint),
  post: (endpoint, data, isFormData) => API.request('POST', endpoint, data, isFormData),
  put: (endpoint, data) => API.request('PUT', endpoint, data),
  delete: (endpoint) => API.request('DELETE', endpoint),

  // Auth
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.request('PUT', '/auth/profile', data, true),
  changePassword: (data) => API.put('/auth/change-password', data),

  // Tickets
  getTickets: (params = {}) => API.get(`/tickets?${new URLSearchParams(params)}`),
  getTicket: (id) => API.get(`/tickets/${id}`),
  createTicket: (data) => API.post('/tickets', data, true),
  updateTicket: (id, data) => API.put(`/tickets/${id}`, data),
  addMessage: (id, data) => API.request('POST', `/tickets/${id}/messages`, data, true),
  assignTicket: (id, agentId) => API.put(`/tickets/${id}/assign`, { agentId }),
  getAISuggestion: (id) => API.get(`/tickets/${id}/ai-suggestion`),
  rateTicket: (id, rating) => API.put(`/tickets/${id}/rate`, { rating }),
  deleteTicket: (id) => API.delete(`/tickets/${id}`),

  // Admin
  getStats: () => API.get('/admin/stats'),
  getUsers: (params = {}) => API.get(`/admin/users?${new URLSearchParams(params)}`),
  updateUser: (id, data) => API.put(`/admin/users/${id}`, data),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  getAgentPerformance: () => API.get('/admin/agent-performance'),
  getSLAReport: () => API.get('/admin/sla-report'),

  // Notifications
  getNotifications: (params = {}) => API.get(`/notifications?${new URLSearchParams(params)}`),
  markNotifRead: (id) => API.put(`/notifications/${id}/read`),
  markAllNotifRead: () => API.put('/notifications/read-all'),
  deleteNotif: (id) => API.delete(`/notifications/${id}`),
};

/* ======================================================
   TOAST NOTIFICATIONS
====================================================== */
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(title, message = '', type = 'info', duration = 4000) {
    this.init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
    `;
    this.container.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  },

  success: (title, msg) => Toast.show(title, msg, 'success'),
  error: (title, msg) => Toast.show(title, msg, 'error'),
  warning: (title, msg) => Toast.show(title, msg, 'warning'),
  info: (title, msg) => Toast.show(title, msg, 'info'),
};

/* ======================================================
   LOADING SPINNER
====================================================== */
const Loader = {
  overlay: null,
  show() {
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'spinner-overlay';
      this.overlay.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(this.overlay);
    }
    this.overlay.classList.add('active');
  },
  hide() {
    if (this.overlay) this.overlay.classList.remove('active');
  },
};

/* ======================================================
   THEME
====================================================== */
const Theme = {
  init() {
    const saved = localStorage.getItem(KEYS.THEME) || 'light';
    this.apply(saved);
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    this.apply(next);
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEYS.THEME, theme);
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  },
};

/* ======================================================
   SIDEBAR
====================================================== */
const Sidebar = {
  sidebar: null,
  overlay: null,

  init() {
    this.sidebar = document.querySelector('.sidebar');
    this.overlay = document.querySelector('.sidebar-overlay');
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }
  },

  open() {
    this.sidebar?.classList.add('mobile-open');
    this.overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  },
  close() {
    this.sidebar?.classList.remove('mobile-open');
    this.overlay?.classList.remove('active');
    document.body.style.overflow = '';
  },
  toggle() {
    if (this.sidebar?.classList.contains('mobile-open')) this.close();
    else this.open();
  },
};

/* ======================================================
   NOTIFICATION DROPDOWN
====================================================== */
const NotifDropdown = {
  isOpen: false,

  toggle(btn) {
    const dropdown = document.querySelector('.notif-dropdown');
    if (!dropdown) return;
    this.isOpen = !this.isOpen;
    dropdown.classList.toggle('open', this.isOpen);
    if (this.isOpen) this.load();
  },

  close() {
    const dropdown = document.querySelector('.notif-dropdown');
    dropdown?.classList.remove('open');
    this.isOpen = false;
  },

  async load() {
    const list = document.querySelector('.notif-list');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Loading...</div>';
    const res = await API.getNotifications({ limit: 10 });
    if (!res?.ok) return;
    const notifs = res.data.data;
    if (notifs.length === 0) {
      list.innerHTML = '<div style="padding:28px;text-align:center;color:var(--text-muted)">No notifications</div>';
      return;
    }
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.isRead ? '' : 'unread'}" onclick="NotifDropdown.handleClick('${n._id}', '${n.link || ''}')">
        <div class="notif-item-icon" style="background:${getNotifColor(n.type)}">${getNotifIcon(n.type)}</div>
        <div class="notif-item-content">
          <div class="notif-item-message">${n.message}</div>
          <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
        </div>
      </div>
    `).join('');
  },

  async handleClick(id, link) {
    await API.markNotifRead(id);
    this.close();
    if (link) window.location.href = link;
  },

  async markAll() {
    await API.markAllNotifRead();
    this.load();
    updateNotifBadge(0);
    Toast.success('Done', 'All notifications marked as read');
  },
};

/* ======================================================
   HELPERS
====================================================== */
const getNotifIcon = (type) => {
  const icons = {
    ticket_created: '🎫', ticket_assigned: '👤', ticket_status_changed: '🔄',
    ticket_resolved: '✅', ticket_message: '💬', sla_warning: '⚠️', system: '🔔',
  };
  return icons[type] || '🔔';
};

const getNotifColor = (type) => {
  const colors = {
    ticket_created: '#4F46E5', ticket_assigned: '#06B6D4', ticket_status_changed: '#F59E0B',
    ticket_resolved: '#10B981', ticket_message: '#8B5CF6', sla_warning: '#EF4444', system: '#6B7280',
  };
  return colors[type] || '#6B7280';
};

const updateNotifBadge = (count) => {
  const badge = document.querySelector('.notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
};

const timeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getPriorityBadge = (priority) => {
  const map = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Critical: 'badge-critical' };
  return `<span class="badge ${map[priority] || 'badge-medium'}">${priority}</span>`;
};

const getStatusBadge = (status) => {
  const map = {
    'Open': 'badge-open',
    'In Progress': 'badge-inprogress',
    'Pending': 'badge-pending',
    'Resolved': 'badge-resolved',
    'Closed': 'badge-closed',
  };
  return `<span class="badge ${map[status] || 'badge-open'}">${status}</span>`;
};

const getSentimentBadge = (sentiment) => {
  const map = { Positive: 'badge-positive', Neutral: 'badge-neutral', Negative: 'badge-negative' };
  return `<span class="badge ${map[sentiment] || 'badge-neutral'}">${sentiment}</span>`;
};

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const escapeHtml = (str) => {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

const slugify = (str) => str.toLowerCase().replace(/\s+/g, '');

const getSLAStatus = (dueDate, status) => {
  if (['Resolved', 'Closed'].includes(status)) return { label: 'Met', cls: 'safe' };
  const now = new Date();
  const due = new Date(dueDate);
  const hoursLeft = (due - now) / 3600000;
  if (hoursLeft < 0) return { label: 'Overdue', cls: 'overdue' };
  if (hoursLeft < 4) return { label: `${Math.round(hoursLeft)}h left`, cls: 'warning' };
  if (hoursLeft < 24) return { label: `${Math.round(hoursLeft)}h left`, cls: 'warning' };
  return { label: `${Math.floor(hoursLeft / 24)}d left`, cls: 'safe' };
};

/* ======================================================
   APP INIT
====================================================== */
const App = {
  async init() {
    Theme.init();
    Sidebar.init();

    // Set sidebar user info
    const user = Auth.getUser();
    if (user) {
      const nameEl = document.querySelector('.sidebar-user-name');
      const roleEl = document.querySelector('.sidebar-user-role');
      const avatarEl = document.querySelector('.sidebar-avatar');
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      if (avatarEl) {
        if (user.profileImage) {
          avatarEl.innerHTML = `<img src="${backendAsset(user.profileImage)}" alt="${user.name}">`;
        } else {
          avatarEl.textContent = getInitials(user.name);
        }
      }

      // Load unread notification count
      const res = await API.getNotifications({ limit: 1 });
      if (res?.ok) updateNotifBadge(res.data.unreadCount);
    }

    // Hamburger
    const hamburger = document.querySelector('.hamburger-btn');
    if (hamburger) hamburger.addEventListener('click', () => Sidebar.toggle());

    // Theme toggle
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => Theme.toggle());

    // Notification bell
    const notifBtn = document.querySelector('.notif-btn');
    if (notifBtn) notifBtn.addEventListener('click', (e) => { e.stopPropagation(); NotifDropdown.toggle(notifBtn); });

    // Mark all read
    const markAllBtn = document.querySelector('.mark-all-read');
    if (markAllBtn) markAllBtn.addEventListener('click', () => NotifDropdown.markAll());

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notif-btn') && !e.target.closest('.notif-dropdown')) {
        NotifDropdown.close();
      }
    });

    // Logout
    document.querySelectorAll('.logout-btn, .sidebar-logout').forEach(btn => {
      btn.addEventListener('click', () => {
        Auth.clearSession();
        window.location.href = '/pages/login.html';
      }); 
    });

    // Set active sidebar link
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar-link').forEach(link => {
      if (link.dataset.page === currentPage) link.classList.add('active');
    });
  },
};

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

/* ======================================================
   MODAL UTILITY
====================================================== */
const Modal = {
  open: (id) => {
    const m = document.getElementById(id);
    m?.classList.add('open');
  },
  close: (id) => {
    const m = document.getElementById(id);
    m?.classList.remove('open');
  },
};
// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

/* ======================================================
   CHART HELPERS
====================================================== */
const ChartColors = {
  primary: '#4F46E5',
  accent: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  critical: '#7C3AED',
  muted: '#94A3B8',
  palette: ['#4F46E5','#06B6D4','#10B981','#F59E0B','#EF4444','#7C3AED','#EC4899'],
};

const createBarChart = (ctx, labels, datasets, options = {}) => {
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: datasets.length > 1 },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
        y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94A3B8', stepSize: 1 } },
      },
      ...options,
    },
  });
};

const createPieChart = (ctx, labels, data, colors = ChartColors.palette) => {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, spacing: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, color: '#94A3B8', boxWidth: 12 } },
      },
    },
  });
};

const createLineChart = (ctx, labels, datasets) => {
  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: datasets.length > 1 } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
        y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#94A3B8', stepSize: 1 } },
      },
    },
  });
};