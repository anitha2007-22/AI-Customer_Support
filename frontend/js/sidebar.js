/**
 * Sidebar HTML generator — role-aware navigation
 * Usage: document.getElementById('sidebar-root').innerHTML = buildSidebar('admin');
 */

function buildSidebar(role) {
  const user = Auth.getUser();
  if (!user) return '';

  const pages = {
    admin: [
      { section: 'Overview' },
      { icon: '📊', label: 'Dashboard', page: 'admin-dashboard.html' },
      { icon: '📈', label: 'Analytics', page: 'analytics.html' },
      { section: 'Tickets' },
      { icon: '🎫', label: 'All Tickets', page: 'tickets.html' },
      { icon: '⚠️', label: 'SLA Monitor', page: 'sla.html' },
      { section: 'People' },
      { icon: '👥', label: 'Users', page: 'users.html' },
      { icon: '🛠️', label: 'Agents', page: 'agents.html' },
      { section: 'System' },
      { icon: '🔔', label: 'Notifications', page: 'notifications.html', badge: true },
      { icon: '👤', label: 'Profile', page: 'profile.html' },
      { icon: '⚙️', label: 'Settings', page: 'settings.html' },
    ],
    agent: [
      { section: 'Work' },
      { icon: '📊', label: 'Dashboard', page: 'agent-dashboard.html' },
      { icon: '🎫', label: 'My Tickets', page: 'tickets.html' },
      { section: 'Account' },
      { icon: '🔔', label: 'Notifications', page: 'notifications.html', badge: true },
      { icon: '👤', label: 'Profile', page: 'profile.html' },
      { icon: '⚙️', label: 'Settings', page: 'settings.html' },
    ],
    customer: [
      { section: 'Support' },
      { icon: '📊', label: 'Dashboard', page: 'customer-dashboard.html' },
      { icon: '🎫', label: 'My Tickets', page: 'tickets.html' },
      { icon: '➕', label: 'New Ticket', page: 'create-ticket.html' },
      { section: 'Account' },
      { icon: '🔔', label: 'Notifications', page: 'notifications.html', badge: true },
      { icon: '👤', label: 'Profile', page: 'profile.html' },
      { icon: '⚙️', label: 'Settings', page: 'settings.html' },
    ],
  };

  const nav = pages[role] || pages.customer;
  const avatarHtml = user.profileImage
    ? `<img src="${backendAsset(user.profileImage)}" alt="${user.name}">`
    : getInitials(user.name);

  const navHtml = nav.map(item => {
    if (item.section) {
      return `<div class="sidebar-section-label">${item.section}</div>`;
    }
    return `
      <a class="sidebar-link" href="${item.page}" data-page="${item.page}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
        ${item.badge ? '<span class="nav-badge notif-count" style="display:none">0</span>' : ''}
      </a>
    `;
  }).join('');

  return `
    <div class="sidebar-logo">
      <div class="logo-icon">🎫</div>
      <div>
        <div class="logo-text">SupportDesk</div>
        <div class="logo-sub">${role.charAt(0).toUpperCase() + role.slice(1)} Portal</div>
      </div>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-user">
      <div class="sidebar-avatar">${avatarHtml}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${escapeHtml(user.name)}</div>
        <div class="sidebar-user-role">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
      </div>
      <span class="sidebar-logout logout-btn" title="Logout">⎋</span>
    </div>
  `;
}

function buildTopbar(title, actions = '') {
  return `
    <button class="hamburger-btn" onclick="Sidebar.toggle()">☰</button>
    <h1 class="topbar-title">${title}</h1>
    <div class="topbar-right">
      ${actions}
      <div style="position:relative">
        <button class="notif-btn" title="Notifications">
          🔔
          <span class="notif-badge" style="display:none">0</span>
        </button>
        <div class="notif-dropdown">
          <div class="notif-dropdown-header">
            <h3>Notifications</h3>
            <span class="mark-all-read" onclick="NotifDropdown.markAll()">Mark all read</span>
          </div>
          <div class="notif-list"></div>
          <div class="notif-dropdown-footer">
            <a href="notifications.html">View all notifications →</a>
          </div>
        </div>
      </div>
      <button class="theme-toggle" title="Toggle theme">🌙</button>
    </div>
  `;
}

function initPage(role, pageTitle, topbarActions = '') {
  if (Auth.redirectIfNotLoggedIn()) return;
  const user = Auth.getUser();
  if (user && user.role !== role && role !== 'any') {
    Auth.redirectToDashboard(user.role);
    return;
  }

  const sidebarRoot = document.getElementById('sidebar-root');
  if (sidebarRoot) sidebarRoot.innerHTML = buildSidebar(role === 'any' ? user.role : role);

  const topbarRoot = document.getElementById('topbar-root');
  if (topbarRoot) topbarRoot.innerHTML = buildTopbar(pageTitle, topbarActions);

  // Highlight active sidebar link
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });

  // Initialize sidebar overlay
  if (!document.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
}