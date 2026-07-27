function inspectionStatusMarkup(status) {
  if (status === 'passed') return `<span class="status-pill status-pill--passed">${icon('check')} Passed</span>`;
  if (status === 'failed') return `<span class="status-pill status-pill--failed">${icon('x')} Failed</span>`;
  return `<span class="status-pill status-pill--pending">${icon('minus')} Not Inspected</span>`;
}

function renderInspectionSummary() {
  const totals = inspectionCounts();
  const trades = [...new Set(data.inspections.map((item) => item.trade))];
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Inspections' })}
      <main class="page">
        ${renderProjectStrip()}
        <div class="content">
          <section class="toolbar section">
            <div class="toolbar__group">
              <label class="select-wrap"><span class="sr-only">Select room</span><select data-control="inspection-room">${data.rooms.slice(0, 12).map((room) => `<option value="${room.id}" ${ui.selectedRoomId === room.id ? 'selected' : ''}>Room ${room.number}</option>`).join('')}</select></label>
              <label class="select-wrap"><span class="sr-only">Select trade</span><select data-control="inspection-summary-trade"><option value="all">All Trades</option>${trades.map((trade) => `<option value="${escapeHtml(trade)}">${escapeHtml(trade)}</option>`).join('')}</select></label>
            </div>
            <button class="icon-button icon-button--light" type="button" data-action="open-add-inspection" aria-label="Add inspection">${icon('plus')}</button>
          </section>

          <section class="inspection-totals section">
            <div class="inspection-total"><span class="stat-card__icon icon-green">${icon('check')}</span><div><div class="stat-card__value">${totals.passed}</div><div class="stat-card__label">Passed</div></div></div>
            <div class="inspection-total"><span class="stat-card__icon icon-red">${icon('x')}</span><div><div class="stat-card__value">${totals.failed}</div><div class="stat-card__label">Failed</div></div></div>
            <div class="inspection-total"><span class="stat-card__icon icon-navy">${icon('minus')}</span><div><div class="stat-card__value">${totals.pending}</div><div class="stat-card__label">Not Inspected</div></div></div>
          </section>

          <div class="table-wrap table-wrap--responsive">
            <table class="data-table"><thead><tr><th>Trade</th><th>Passed</th><th>Failed</th><th>Not Inspected</th><th></th></tr></thead><tbody>
              ${trades.map((trade) => {
                const counts = inspectionCounts(trade);
                return `<tr data-action="open-inspection-trade" data-trade="${escapeHtml(trade)}"><td><div class="trade-cell">${tradeIcon(trade)}<strong>${escapeHtml(trade)}</strong></div></td><td><span class="text-green strong">● ${counts.passed}</span></td><td><span class="text-red strong">● ${counts.failed}</span></td><td><span class="strong">● ${counts.pending}</span></td><td>${icon('chevron')}</td></tr>`;
              }).join('')}
            </tbody></table>
          </div>
          <div class="mobile-card-list">
            ${trades.map((trade) => {
              const counts = inspectionCounts(trade);
              return `<button class="mobile-row-card" type="button" data-action="open-inspection-trade" data-trade="${escapeHtml(trade)}" style="text-align:left"><div class="mobile-row-card__head"><div class="trade-cell">${tradeIcon(trade)}<strong>${escapeHtml(trade)}</strong></div>${icon('chevron')}</div><div class="mobile-row-card__foot" style="margin-top:12px"><span class="text-green strong">● ${counts.passed}</span><span class="text-red strong">● ${counts.failed}</span><span class="strong">● ${counts.pending}</span></div></button>`;
            }).join('')}
          </div>
        </div>
      </main>
      ${renderBottomNav('inspections')}
      ${renderDrawer('inspections')}
    </div>`;
}

function inspectionStatusSelect(item) {
  return `<select class="table-select" data-control="inspection-status" data-inspection="${item.id}" aria-label="Change inspection result"><option value="not-inspected" ${item.status === 'not-inspected' ? 'selected' : ''}>Not Inspected</option><option value="passed" ${item.status === 'passed' ? 'selected' : ''}>Passed</option><option value="failed" ${item.status === 'failed' ? 'selected' : ''}>Failed</option></select>`;
}

function renderInspectionDetail() {
  const trade = ui.inspectionTrade;
  const list = data.inspections.filter((item) => item.trade === trade);
  const counts = inspectionCounts(trade);
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Inspections', back: '#inspections' })}
      <main class="page">
        <div class="content">
          <section class="toolbar section">
            <label class="select-wrap"><span class="sr-only">Select trade</span><select data-control="inspection-detail-trade">${[...new Set(data.inspections.map((item) => item.trade))].map((name) => `<option value="${escapeHtml(name)}" ${name === trade ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label>
            <button class="button button--primary" type="button" data-action="open-add-inspection">${icon('plus')}Add Inspection</button>
          </section>

          <section class="inspection-totals section">
            <div class="inspection-total"><span class="stat-card__icon icon-green">${icon('check')}</span><div><div class="stat-card__value">${counts.passed}</div><div class="stat-card__label">Passed</div></div></div>
            <div class="inspection-total"><span class="stat-card__icon icon-red">${icon('x')}</span><div><div class="stat-card__value">${counts.failed}</div><div class="stat-card__label">Failed</div></div></div>
            <div class="inspection-total"><span class="stat-card__icon icon-navy">${icon('minus')}</span><div><div class="stat-card__value">${counts.pending}</div><div class="stat-card__label">Not Inspected</div></div></div>
          </section>

          <section class="card inspection-detail-card">
            <div class="inspection-detail-row inspection-detail-row--head"><div>Inspection</div><div>Status</div><div>Assignee</div><div>Scheduled</div><div>Completed</div><div>Result</div><div>Comments</div></div>
            ${list.map((item) => `
              <div>
                <div class="inspection-detail-row">
                  <div><div class="inspection-detail-row__title">${escapeHtml(item.title)}</div><div class="tiny muted" style="margin-top:4px">${escapeHtml(item.description)}</div></div>
                  <div>${inspectionStatusMarkup(item.status)}</div>
                  <div>${escapeHtml(item.assignee)}</div>
                  <div>${formatDate(item.scheduled)}</div>
                  <div>${formatDate(item.completed)}</div>
                  <div>${inspectionStatusSelect(item)}</div>
                  <div><button class="icon-button icon-button--light" type="button" data-action="inspection-comment" data-inspection="${item.id}" aria-label="Edit inspection comment">${icon('comment')}</button></div>
                </div>
                ${item.comment ? `<div class="inspection-comment"><strong>Comment:</strong> ${escapeHtml(item.comment)}<br><span class="tiny">Added by ${escapeHtml(item.assignee)}${item.completed ? ` on ${formatDate(item.completed)}` : ''}</span></div>` : ''}
              </div>`).join('')}
          </section>
        </div>
      </main>
      ${renderBottomNav('inspections')}
      ${renderDrawer('inspections')}
    </div>`;
}

function priorityLabel(priority) {
  if (priority === 'critical') return 'Critical Path';
  if (priority === 'moderate') return 'Moderate';
  return 'Low';
}

function priorityClass(priority) {
  if (priority === 'critical') return 'status-pill--critical';
  if (priority === 'moderate') return 'status-pill--moderate';
  return 'status-pill--low';
}

function renderConstraintCard(item) {
  const iconClass = item.status === 'resolved' ? 'icon-green' : item.priority === 'critical' ? 'icon-red' : item.priority === 'moderate' ? 'icon-orange' : 'icon-blue';
  return `
    <article class="constraint-card">
      <div class="constraint-card__top">
        <div class="constraint-card__icon ${iconClass}">${item.status === 'resolved' ? icon('check') : item.type === 'Clash' ? icon('bolt') : icon('clock')}</div>
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <div><span class="status-pill ${item.status === 'resolved' ? 'status-pill--resolved' : 'status-pill--complete'}">${escapeHtml(item.type)}</span> <span class="small muted">• ${item.status === 'resolved' ? 'Resolved' : 'Active'}</span></div>
          <p class="constraint-card__description">${escapeHtml(item.description)}</p>
        </div>
        <button class="button button--secondary button--small" type="button" data-action="toggle-constraint" data-constraint="${item.id}">${item.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
      </div>
      <div class="constraint-card__footer">
        <div class="small">${icon('calendar')} <strong>Impact:</strong> ${formatDate(item.startDate)} – ${formatDate(item.endDate)}</div>
        <span class="status-pill ${priorityClass(item.priority)}">${priorityLabel(item.priority)}</span>
      </div>
    </article>`;
}

function renderConstraints() {
  const filtered = data.constraints.filter((item) => ui.constraintFilter === 'all' || item.priority === ui.constraintFilter);
  const active = filtered.filter((item) => item.status === 'active');
  const resolved = filtered.filter((item) => item.status === 'resolved');
  const count = (priority) => data.constraints.filter((item) => item.priority === priority && item.status === 'active').length;
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Constraints' })}
      <main class="page page--canvas">
        <div class="content">
          <section class="toolbar section">
            <div class="priority-filter" aria-label="Constraint priority filters">
              <button class="pill ${ui.constraintFilter === 'all' ? 'is-active' : ''}" type="button" data-action="constraint-filter" data-filter="all">All <span class="count-pill">${data.constraints.length}</span></button>
              <button class="pill ${ui.constraintFilter === 'critical' ? 'is-active' : ''}" type="button" data-action="constraint-filter" data-filter="critical">Critical Path <span class="count-pill">${count('critical')}</span></button>
              <button class="pill ${ui.constraintFilter === 'moderate' ? 'is-active' : ''}" type="button" data-action="constraint-filter" data-filter="moderate">Moderate <span class="count-pill">${count('moderate')}</span></button>
              <button class="pill ${ui.constraintFilter === 'low' ? 'is-active' : ''}" type="button" data-action="constraint-filter" data-filter="low">Low <span class="count-pill">${count('low')}</span></button>
            </div>
            <button class="button button--primary" type="button" data-action="open-add-constraint">${icon('plus')}Add Constraint</button>
          </section>

          <div class="constraint-groups">
            <section>
              <div class="section-head"><h2>Active Constraints</h2><span class="count-pill">${active.length}</span></div>
              <div class="constraint-list">${active.map(renderConstraintCard).join('') || `<div class="empty-state"><div class="empty-state__icon">${icon('check')}</div><strong>No active constraints in this priority.</strong></div>`}</div>
            </section>
            <section>
              <div class="section-head"><h2>Resolved Constraints</h2><span class="count-pill">${resolved.length}</span></div>
              <div class="constraint-list">${resolved.map(renderConstraintCard).join('') || `<div class="empty-state"><div class="empty-state__icon">${icon('inbox')}</div><strong>No resolved constraints in this priority.</strong></div>`}</div>
            </section>
          </div>
        </div>
      </main>
      ${renderBottomNav('constraints')}
      ${renderDrawer('constraints')}
    </div>`;
}

function renderMore() {
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'More' })}
      <main class="page page--canvas">
        <div class="content">
          <section class="card room-identity section">
            <div class="stat-card__icon icon-blue">${icon('user')}</div>
            <div><h1>James Clark</h1><p class="muted no-margin">TradeSYNC demo user · Local prototype data</p></div>
          </section>

          <section class="more-grid">
            <article class="more-card"><div class="more-card__icon">${icon('message')}</div><div><h3>Messages</h3><p class="muted small no-margin">Review project conversations and coordination notes.</p><button class="button button--ghost button--small" type="button" data-action="open-messages">Open ${data.messages.length} messages</button></div></article>
            <article class="more-card"><div class="more-card__icon">${icon('bell')}</div><div><h3>Notifications</h3><p class="muted small no-margin">See failed inspections, constraints, and completion updates.</p><button class="button button--ghost button--small" type="button" data-action="open-notifications">Open ${data.notifications.length} notifications</button></div></article>
            <article class="more-card"><div class="more-card__icon">${icon('download')}</div><div><h3>Export Demo Data</h3><p class="muted small no-margin">Download tasks, inspections, rooms, and constraints as JSON.</p><button class="button button--ghost button--small" type="button" data-action="export-data">Download data</button></div></article>
            <article class="more-card"><div class="more-card__icon">${icon('reset')}</div><div><h3>Reset Prototype</h3><p class="muted small no-margin">Erase local changes and restore the original TradeSYNC demo.</p><button class="button button--danger button--small" type="button" data-action="confirm-reset">Reset demo</button></div></article>
            <article class="more-card"><div class="more-card__icon">${icon('upload')}</div><div><h3>Install TradeSYNC</h3><p class="muted small no-margin">Add this prototype to your phone or desktop as a web app.</p><button class="button button--ghost button--small" type="button" data-action="install-app" ${ui.installPrompt ? '' : 'disabled'}>${ui.installPrompt ? 'Install app' : 'Use browser Install option'}</button></div></article>
            <article class="more-card"><div class="more-card__icon">${icon('settings')}</div><div><h3>Prototype Status</h3><p class="muted small no-margin">Changes are saved only in this browser. A shared backend is the next production step.</p></div></article>
          </section>
        </div>
      </main>
      ${renderBottomNav('more')}
      ${renderDrawer('more')}
    </div>`;
}

function modalShell(title, body, footer = '') {
  return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><header class="modal__header"><h2>${escapeHtml(title)}</h2><button class="icon-button icon-button--light" type="button" data-action="close-modal" aria-label="Close">${icon('x')}</button></header><div class="modal__body">${body}</div>${footer ? `<footer class="modal__footer">${footer}</footer>` : ''}</section></div>`;
}
