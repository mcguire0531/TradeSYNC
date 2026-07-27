function roomStatusMarkup(room) {
  if (room.status === 'complete') return `<span class="status-pill status-pill--complete">${icon('check')} Complete</span>`;
  if (room.status === 'not-started') return `<span class="status-pill status-pill--pending">${icon('minus')} Not Started</span>`;
  return `<span class="status-pill status-pill--failed">${icon('x')} Incomplete</span>`;
}

function renderRooms() {
  const query = ui.roomSearch.trim().toLowerCase();
  const filtered = data.rooms.filter((room) => {
    const matchesStatus = ui.roomFilter === 'all' || room.status === ui.roomFilter;
    const matchesSearch = !query || `${room.number} ${room.name} ${room.location}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  ui.roomPage = clamp(ui.roomPage, 1, totalPages);
  const pageRooms = filtered.slice((ui.roomPage - 1) * perPage, ui.roomPage * perPage);
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    let page = index + 1;
    if (totalPages > 5 && ui.roomPage > 3) page = Math.min(totalPages - 4 + index, ui.roomPage - 2 + index);
    return page;
  });

  const tableRows = pageRooms.map((room) => `
    <tr data-action="open-room" data-room="${room.id}">
      <td class="strong">${room.number}</td>
      <td>${escapeHtml(room.name)}</td>
      <td>${escapeHtml(room.location)}</td>
      <td>${roomStatusMarkup(room)}</td>
      <td><div class="inline-progress">${room.progress > 0 && room.progress < 100 ? makeProgress(room.progress, progressColor(room.progress)) : makeProgress(room.progress, room.progress === 100 ? 'var(--green)' : '#dfe4ee')}<strong>${room.progress}%</strong></div></td>
      <td class="row-action">${icon('chevron')}</td>
    </tr>`).join('');

  const mobileRows = pageRooms.map((room) => `
    <button class="mobile-row-card" type="button" data-action="open-room" data-room="${room.id}" style="text-align:left">
      <div class="mobile-row-card__head"><strong>Room ${room.number}</strong>${roomStatusMarkup(room)}</div>
      <div class="mobile-row-card__body">
        <div><div class="mobile-row-card__label">Room name</div><div class="mobile-row-card__value">${escapeHtml(room.name)}</div></div>
        <div><div class="mobile-row-card__label">Location</div><div class="mobile-row-card__value">${escapeHtml(room.location)}</div></div>
      </div>
      <div class="mobile-row-card__foot"><div style="flex:1">${makeProgress(room.progress)}</div><strong>${room.progress}%</strong>${icon('chevron')}</div>
    </button>`).join('');

  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Rooms', back: '#home' })}
      <main class="page">
        ${renderProjectStrip()}
        <div class="content">
          <section class="section">
            <div class="section-head"><h2>${filtered.length} Room${filtered.length === 1 ? '' : 's'}</h2></div>
            <div class="toolbar">
              <div class="toolbar__group" style="flex:1">
                <div class="select-wrap" style="flex:1;max-width:360px"><input class="input" type="search" placeholder="Search rooms" value="${escapeHtml(ui.roomSearch)}" data-control="room-search" aria-label="Search rooms" /></div>
              </div>
              <div class="toolbar__group">
                <label class="select-wrap"><span class="sr-only">Filter rooms</span><select data-control="room-filter"><option value="all" ${ui.roomFilter === 'all' ? 'selected' : ''}>All Statuses</option><option value="complete" ${ui.roomFilter === 'complete' ? 'selected' : ''}>Complete</option><option value="incomplete" ${ui.roomFilter === 'incomplete' ? 'selected' : ''}>Incomplete</option><option value="not-started" ${ui.roomFilter === 'not-started' ? 'selected' : ''}>Not Started</option></select></label>
              </div>
            </div>
          </section>

          <div class="table-wrap table-wrap--responsive">
            <table class="data-table">
              <thead><tr><th>Room #</th><th>Room Name</th><th>Location</th><th>Status</th><th>Progress</th><th></th></tr></thead>
              <tbody>${tableRows || `<tr><td colspan="6"><div class="empty-state">No rooms match this filter.</div></td></tr>`}</tbody>
            </table>
          </div>
          <div class="mobile-card-list">${mobileRows || `<div class="empty-state">No rooms match this filter.</div>`}</div>

          <nav class="pagination" aria-label="Room pages">
            <button class="page-button" type="button" data-action="room-page" data-page="${ui.roomPage - 1}" ${ui.roomPage === 1 ? 'disabled' : ''}>${icon('back')}</button>
            ${pages.map((page) => `<button class="page-button ${ui.roomPage === page ? 'is-active' : ''}" type="button" data-action="room-page" data-page="${page}">${page}</button>`).join('')}
            <button class="page-button" type="button" data-action="room-page" data-page="${ui.roomPage + 1}" ${ui.roomPage === totalPages ? 'disabled' : ''}>${icon('chevron')}</button>
          </nav>
        </div>
      </main>
      ${renderBottomNav('home')}
      ${renderDrawer('rooms')}
    </div>`;
}

function statusIcon(status) {
  if (status === 'complete' || status === 'passed') return `<span class="status-icon status-icon--${status === 'passed' ? 'passed' : 'complete'}">${icon('check')}</span>`;
  if (status === 'failed') return `<span class="status-icon status-icon--failed">${icon('x')}</span>`;
  if (status === 'in-progress') return `<span class="status-icon status-icon--progress"></span>`;
  return `<span class="status-icon status-icon--not-started">${icon('minus')}</span>`;
}

function tradeIcon(trade) {
  const meta = TRADE_META.find((item) => item.name === trade) || { symbol: '•' };
  return `<span class="trade-icon trade-icon--${slugify(trade)}" aria-hidden="true">${escapeHtml(meta.symbol)}</span>`;
}

function renderMetric(iconClass, iconName, value, label, action = '') {
  const attrs = action ? ` data-action="${action}" role="button" tabindex="0"` : '';
  return `<div class="metric"${attrs}><span class="stat-card__icon ${iconClass}">${icon(iconName)}</span><div><div class="metric__value">${value}</div><div class="metric__label">${label}</div></div></div>`;
}

function renderActivityItem(item) {
  const status = item.type === 'failed' ? 'failed' : item.type === 'passed' || item.type === 'complete' ? 'complete' : 'in-progress';
  return `<div class="activity-item">${statusIcon(status)}<div><div class="activity-item__title">${escapeHtml(item.title)}</div><div class="activity-item__meta">${escapeHtml(item.meta)}</div></div><button class="icon-button icon-button--light" type="button" data-action="open-messages" aria-label="Open comments">${icon('comment')}</button></div>`;
}

function renderRoomOverviewPanels(room) {
  const trades = roomTrades(room.id);
  const complete = trades.filter((trade) => trade.status === 'complete').length;
  const inProgress = trades.filter((trade) => trade.status === 'in-progress').length;
  const notStarted = trades.filter((trade) => trade.status === 'not-started').length;
  const taskList = roomTasks(room.id);
  const completeTasks = taskList.filter((task) => task.status === 'complete').length;
  const progress = Math.round((complete / trades.length) * 100);
  return `
    <section class="room-summary section">
      <div class="card room-identity">
        <div class="room-icon">${icon('room')}</div>
        <div><h1>Room ${escapeHtml(room.number)}</h1><p class="no-margin">${escapeHtml(room.name)}</p><p class="muted small no-margin">${escapeHtml(room.location)}</p></div>
      </div>
      <div class="card room-due"><div><div class="small">Due: <strong class="text-red">${formatDate(selectedBuilding().dueDate)}</strong></div><div class="small muted" style="margin-top:6px">${dueLabel(selectedBuilding().dueDate)}</div></div></div>
    </section>

    <section class="metric-strip section">
      ${renderMetric('icon-green', 'check', complete, 'Complete')}
      ${renderMetric('icon-red', 'x', inProgress, 'In Progress')}
      ${renderMetric('icon-navy', 'minus', notStarted, 'Not Started')}
      ${renderMetric('icon-navy', 'calendar', taskList.length, 'Total Tasks')}
      ${renderMetric('icon-orange', 'bolt', room.clashes, 'Clashes', 'open-clashes')}
    </section>

    <section class="card progress-panel section">
      <div class="progress-heading"><h2>Overall Progress</h2><strong>${progress}% Complete</strong></div>
      ${makeProgress(progress, progressColor(progress))}
      <p class="muted small" style="margin:10px 0 0">${completeTasks} of ${taskList.length} tasks complete · ${complete} of ${trades.length} trades complete</p>
    </section>

    <section class="card progress-panel section">
      <div class="section-head"><h2>Progress by Trade</h2><button class="button button--ghost button--small" type="button" data-action="go" data-hash="#tasks/${room.id}">Open Trade View</button></div>
      <div class="trade-progress-list">${trades.map((trade) => `
        <div class="trade-progress-row">
          <div class="trade-progress-row__name">${tradeIcon(trade.name)}<span>${escapeHtml(trade.name)}</span></div>
          ${makeProgress(trade.percent, trade.status === 'complete' ? 'var(--green)' : trade.status === 'in-progress' ? 'var(--orange)' : '#dfe4ee')}
          <strong>${trade.percent}%</strong>
        </div>`).join('')}</div>
    </section>

    <section class="card progress-panel section">
      <div class="section-head"><h2>Recent Activity</h2><button class="button button--ghost button--small" type="button" data-action="open-notifications">View All</button></div>
      <div class="activity-list">${data.activity.slice(0, 4).map(renderActivityItem).join('')}</div>
    </section>`;
}
