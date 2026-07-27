function route() {
  const hash = (location.hash || '#home').slice(1);
  const parts = hash.split('/').filter(Boolean);
  const view = parts[0] || 'home';
  if (view === 'room' && parts[1]) {
    ui.selectedRoomId = parts[1];
    ensureRoomWorkspace(parts[1]);
  }
  if (view === 'tasks' && parts[1]) {
    ui.selectedRoomId = parts[1];
    ensureRoomWorkspace(parts[1]);
  }
  if (view === 'inspections' && parts[1]) ui.inspectionTrade = decodeURIComponent(parts.slice(1).join('/'));
  return { view, detail: parts.slice(1).join('/') };
}

function go(hash) {
  const target = hash.startsWith('#') ? hash : `#${hash}`;
  if (location.hash === target) render();
  else location.hash = target;
}

function renderTopbar({ title, subtitle = '', back = '', settings = false }) {
  return `
    <header class="topbar">
      <div class="topbar__left">
        ${back
          ? `<button class="back-button" type="button" data-action="go" data-hash="${escapeHtml(back)}" aria-label="Go back">${icon('back')}<span>Back</span></button>`
          : `<button class="icon-button" type="button" data-action="open-drawer" aria-label="Open menu">${icon('menu')}</button>`}
      </div>
      <div class="topbar__center">
        <div class="topbar__title">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="topbar__subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div class="topbar__right">
        <button class="icon-button" type="button" data-action="open-messages" aria-label="Messages">${icon('message')}</button>
        <button class="icon-button" type="button" data-action="open-notifications" aria-label="Notifications">${icon('bell')}<span class="badge">${data.notifications.length}</span></button>
        ${settings ? `<button class="icon-button" type="button" data-action="go" data-hash="#more" aria-label="Settings">${icon('settings')}</button>` : ''}
      </div>
    </header>`;
}

function renderBottomNav(active) {
  const items = [
    { id: 'home', label: 'Home', icon: 'home', hash: '#home' },
    { id: 'tasks', label: 'Tasks', icon: 'tasks', hash: `#tasks/${ui.selectedRoomId}` },
    { id: 'inspections', label: 'Inspections', icon: 'inspections', hash: '#inspections' },
    { id: 'constraints', label: 'Constraints', icon: 'constraints', hash: '#constraints' },
    { id: 'more', label: 'More', icon: 'more', hash: '#more' }
  ];
  return `<nav class="bottom-nav" aria-label="Primary navigation">${items.map((item) => `
    <button class="nav-item ${active === item.id ? 'is-active' : ''}" type="button" data-action="go" data-hash="${item.hash}" aria-current="${active === item.id ? 'page' : 'false'}">
      ${icon(item.icon)}<span>${item.label}</span>
    </button>`).join('')}</nav>`;
}

function renderDrawer(active) {
  if (!ui.drawerOpen) return '';
  const links = [
    ['home', 'Home', 'home', '#home'],
    ['rooms', 'Rooms', 'room', '#rooms'],
    ['tasks', 'Tasks', 'tasks', `#tasks/${ui.selectedRoomId}`],
    ['inspections', 'Inspections', 'inspections', '#inspections'],
    ['constraints', 'Constraints', 'constraints', '#constraints'],
    ['more', 'More & Settings', 'settings', '#more']
  ];
  return `
    <div class="drawer-backdrop" data-action="close-drawer" aria-hidden="true"></div>
    <aside class="drawer" aria-label="Application menu">
      <div class="drawer__brand">
        <img src="assets/tradesync-icon.svg" alt="" />
        <div><div class="strong">TradeSYNC</div><div class="small" style="color:rgba(255,255,255,.72)">Construction coordination</div></div>
      </div>
      <nav class="drawer__nav">
        ${links.map(([id, label, iconName, hash]) => `<button class="drawer__link ${active === id ? 'is-active' : ''}" type="button" data-action="go" data-hash="${hash}">${icon(iconName)}<span>${label}</span></button>`).join('')}
      </nav>
    </aside>`;
}

function renderBuildingCard(building) {
  const days = daysFromToday(building.dueDate);
  return `
    <button class="building-card" type="button" data-action="select-building" data-building="${escapeHtml(building.id)}">
      <img class="building-card__image" src="${escapeHtml(building.image)}" alt="${escapeHtml(building.name)}" />
      <div class="building-card__content">
        <div class="building-card__title">${escapeHtml(building.name)}</div>
        <div class="small muted">${escapeHtml(building.address)}</div>
        <div class="building-card__meta">${icon('calendar')}<span>Due: <strong class="${days < 0 ? 'text-red' : ''}">${formatDate(building.dueDate)}</strong></span></div>
        <div class="progress-row">${makeProgress(building.progress)}<span class="progress-number">${building.progress}%</span></div>
      </div>
      <span aria-hidden="true">${icon('chevron')}</span>
    </button>`;
}

function renderHome() {
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Home' })}
      <main class="page">
        <div class="content">
          <section class="hero-row">
            <div class="welcome-copy">
              <h1>Welcome, James</h1>
              <p class="muted">Select a building to get started.</p>
            </div>
            <button class="button button--primary" type="button" data-action="open-add-building">${icon('plus')}Add New Building</button>
          </section>

          <section class="section">
            <div class="section-head"><h2>My Buildings</h2></div>
            <div class="building-list home-buildings">${data.buildings.map(renderBuildingCard).join('')}</div>
          </section>

          <section class="info-banner">
            <div class="info-banner__illustration">${icon('building')}</div>
            <div>
              <h3>All your projects in one place</h3>
              <p class="muted small no-margin">Stay organized, track progress, coordinate trades, and get work done.</p>
            </div>
          </section>
        </div>
      </main>
      ${renderBottomNav('home')}
      ${renderDrawer('home')}
    </div>`;
}

function renderProjectStrip() {
  const building = selectedBuilding();
  return `
    <section class="project-strip">
      <img class="project-strip__image" src="${escapeHtml(building.image)}" alt="${escapeHtml(building.name)}" />
      <div>
        <h2 class="no-margin">${escapeHtml(building.name)}</h2>
        <p class="muted small no-margin">Level 2</p>
      </div>
      <div class="project-strip__due">
        <div class="small">Due: <strong class="text-red">${formatDate(building.dueDate)}</strong></div>
        <div class="small muted" style="margin-top:5px">${dueLabel(building.dueDate)}</div>
      </div>
    </section>`;
}
