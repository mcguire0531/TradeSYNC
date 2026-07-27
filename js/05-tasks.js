function renderRoomDetail() {
  const room = selectedRoom();
  return `
    <div class="app-shell">
      ${renderTopbar({ title: `Room ${room.number}`, subtitle: room.level, back: '#rooms' })}
      <main class="page">
        <div class="content">${renderRoomOverviewPanels(room)}</div>
      </main>
      ${renderBottomNav('home')}
      ${renderDrawer('rooms')}
    </div>`;
}

function tradeStatusCopy(trade) {
  if (trade.status === 'complete') return `<div class="status-copy"><div class="status-copy__label text-green">Complete</div><div class="status-copy__note">Marked complete by ${escapeHtml(trade.updatedBy)}</div></div>`;
  if (trade.status === 'in-progress') return `<div class="status-copy"><div class="status-copy__label text-orange">In Progress</div><div class="status-copy__note">${trade.complete} of ${trade.total} tasks complete</div></div>`;
  return `<div class="status-copy"><div class="status-copy__label">Not Started</div><div class="status-copy__note">0 of ${trade.total} tasks complete</div></div>`;
}

function renderTradeRows(trades) {
  return trades.map((trade) => `
    <tr>
      <td><div class="trade-cell">${tradeIcon(trade.name)}<div><div class="strong">${escapeHtml(trade.name)}</div><div class="small muted">${trade.complete} / ${trade.total} tasks</div></div></div></td>
      <td><div class="status-line">${statusIcon(trade.status)}${tradeStatusCopy(trade)}</div></td>
      <td>${trade.status === 'in-progress'
        ? `<div class="inline-progress"><strong>${trade.percent}%</strong>${makeProgress(trade.percent, 'var(--orange)')}</div>`
        : `<strong>${trade.percent}%</strong>`}</td>
      <td>${trade.lastUpdated ? formatDate(trade.lastUpdated) : '—'}</td>
      <td>${trade.status === 'complete'
        ? `<button class="button button--secondary button--small" type="button" data-action="reopen-trade" data-trade="${escapeHtml(trade.name)}">Reopen</button>`
        : `<button class="button button--primary button--small" type="button" data-action="complete-trade" data-trade="${escapeHtml(trade.name)}">Mark Complete</button>`}</td>
    </tr>`).join('');
}

function renderTradeCards(trades) {
  return trades.map((trade) => `
    <article class="mobile-row-card">
      <div class="mobile-row-card__head"><div class="trade-cell">${tradeIcon(trade.name)}<div><strong>${escapeHtml(trade.name)}</strong><div class="small muted">${trade.complete} / ${trade.total} tasks</div></div></div><strong>${trade.percent}%</strong></div>
      <div class="mobile-row-card__body"><div class="status-line">${statusIcon(trade.status)}${tradeStatusCopy(trade)}</div>${trade.status === 'in-progress' ? makeProgress(trade.percent, 'var(--orange)') : ''}</div>
      <div class="mobile-row-card__foot"><span class="small muted">Updated ${trade.lastUpdated ? formatDate(trade.lastUpdated) : '—'}</span>${trade.status === 'complete'
        ? `<button class="button button--secondary button--small" type="button" data-action="reopen-trade" data-trade="${escapeHtml(trade.name)}">Reopen</button>`
        : `<button class="button button--primary button--small" type="button" data-action="complete-trade" data-trade="${escapeHtml(trade.name)}">Mark Complete</button>`}</div>
    </article>`).join('');
}

function taskStatusLabel(status) {
  if (status === 'complete') return 'Complete';
  if (status === 'in-progress') return 'In Progress';
  return 'Not Started';
}

function taskStatusMarkup(status) {
  if (status === 'complete') return `<span class="status-pill status-pill--complete">${icon('check')} Complete</span>`;
  if (status === 'in-progress') return `<span class="status-pill status-pill--progress">In Progress</span>`;
  return `<span class="status-pill status-pill--pending">${icon('minus')} Not Started</span>`;
}

function taskStatusSelect(task) {
  return `<select class="table-select" data-control="task-status" data-task="${task.id}" aria-label="Change status for ${escapeHtml(task.title)}"><option value="not-started" ${task.status === 'not-started' ? 'selected' : ''}>Not Started</option><option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option><option value="complete" ${task.status === 'complete' ? 'selected' : ''}>Complete</option></select>`;
}

function visibleTasks() {
  let tasks = roomTasks();
  if (ui.taskTab === 'incomplete') tasks = tasks.filter((task) => task.status !== 'complete');
  if (ui.taskTab === 'mine') tasks = tasks.filter((task) => task.assignee === CURRENT_USER);
  if (ui.taskTradeFilter !== 'all') tasks = tasks.filter((task) => task.trade === ui.taskTradeFilter);
  return tasks;
}

function renderTaskTable(tasks) {
  const rows = tasks.map((task) => `
    <tr>
      <td><div class="task-title"><div class="task-title__name">${escapeHtml(task.title)}</div><div class="task-title__description">${escapeHtml(task.description)}</div></div></td>
      <td><div class="trade-cell">${tradeIcon(task.trade)}<span>${escapeHtml(task.trade)}</span></div></td>
      <td>${taskStatusSelect(task)}</td>
      <td>${escapeHtml(task.assignee)}</td>
      <td>${formatDate(task.dueDate)}</td>
      <td><button class="icon-button icon-button--light" type="button" data-action="open-messages" aria-label="Task comments">${icon('comment')}</button></td>
    </tr>`).join('');
  return `<div class="table-wrap table-wrap--responsive"><table class="data-table"><thead><tr><th>Task</th><th>Trade</th><th>Status</th><th>Assignee</th><th>Due Date</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="empty-state">No tasks match this view.</div></td></tr>`}</tbody></table></div>`;
}

function renderTaskCards(tasks) {
  return `<div class="mobile-card-list">${tasks.map((task) => `
    <article class="mobile-row-card">
      <div class="mobile-row-card__head"><strong>${escapeHtml(task.title)}</strong>${tradeIcon(task.trade)}</div>
      <p class="muted small" style="margin:8px 0 0">${escapeHtml(task.description)}</p>
      <div class="mobile-row-card__body">
        <div><div class="mobile-row-card__label">Trade</div><div class="mobile-row-card__value">${escapeHtml(task.trade)}</div></div>
        <div><div class="mobile-row-card__label">Assignee</div><div class="mobile-row-card__value">${escapeHtml(task.assignee)}</div></div>
        <div><div class="mobile-row-card__label">Due</div><div class="mobile-row-card__value">${formatDate(task.dueDate)}</div></div>
      </div>
      <div class="mobile-row-card__foot">${taskStatusMarkup(task.status)}${taskStatusSelect(task)}</div>
    </article>`).join('') || `<div class="empty-state">No tasks match this view.</div>`}</div>`;
}

function renderTradeTaskView() {
  const room = selectedRoom();
  const trades = roomTrades();
  const complete = trades.filter((trade) => trade.status === 'complete').length;
  const inProgress = trades.filter((trade) => trade.status === 'in-progress').length;
  const notStarted = trades.filter((trade) => trade.status === 'not-started').length;
  const progress = Math.round((complete / trades.length) * 100);
  const tasks = visibleTasks();
  const allTasks = roomTasks();
  const incomplete = allTasks.filter((task) => task.status !== 'complete').length;
  const myTasks = allTasks.filter((task) => task.assignee === CURRENT_USER).length;

  return `
    <div class="content">
      <section class="room-completion-card section">
        <div class="room-completion-card__message">
          <div class="room-completion-card__check">${icon('check')}</div>
          <div><h2>Each trade marks complete when their work in this room is finished.</h2><p class="muted no-margin">When all trades are complete, the room is ready for turnover.</p></div>
        </div>
        <div class="room-completion-card__progress">
          <div class="progress-heading"><strong>Room Progress</strong><span>${progress}% Complete</span></div>
          ${makeProgress(progress, 'var(--green)')}
          <p class="no-margin" style="margin-top:12px">${complete} of ${trades.length} trades complete</p>
        </div>
      </section>

      <section class="stats-grid section">
        <div class="stat-card"><span class="stat-card__icon icon-green">${icon('check')}</span><div><div class="stat-card__value">${complete}</div><div class="stat-card__label">Complete</div></div></div>
        <div class="stat-card"><span class="stat-card__icon icon-orange"></span><div><div class="stat-card__value">${inProgress}</div><div class="stat-card__label">In Progress</div></div></div>
        <div class="stat-card"><span class="stat-card__icon icon-navy">${icon('minus')}</span><div><div class="stat-card__value">${notStarted}</div><div class="stat-card__label">Not Started</div></div></div>
        <div class="stat-card"><span class="stat-card__icon icon-navy">${icon('calendar')}</span><div><div class="stat-card__value">${trades.length}</div><div class="stat-card__label">Total Trades</div></div></div>
        <button class="stat-card" type="button" data-action="open-clashes" style="cursor:pointer"><span class="stat-card__icon icon-orange">${icon('bolt')}</span><div><div class="stat-card__value">${room.clashes}</div><div class="stat-card__label">Clashes</div></div></button>
      </section>

      <section class="section">
        <div class="section-head"><h2>Trades</h2><div class="small muted">${complete} complete · ${inProgress} in progress · ${notStarted} not started</div></div>
        <div class="table-wrap table-wrap--responsive"><table class="data-table"><thead><tr><th>Trade</th><th>Status</th><th>Completed</th><th>Last Updated</th><th></th></tr></thead><tbody>${renderTradeRows(trades)}</tbody></table></div>
        <div class="mobile-card-list">${renderTradeCards(trades)}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Tasks for Room ${room.number}</h2><button class="button button--ghost" type="button" data-action="open-add-task">${icon('plus')}Add Task</button></div>
        <div class="toolbar" style="margin-bottom:12px">
          <div class="subtabs">
            <button class="subtab ${ui.taskTab === 'all' ? 'is-active' : ''}" type="button" data-action="task-tab" data-tab="all">All Tasks <span class="count-pill">${allTasks.length}</span></button>
            <button class="subtab ${ui.taskTab === 'incomplete' ? 'is-active' : ''}" type="button" data-action="task-tab" data-tab="incomplete">Incomplete <span class="count-pill">${incomplete}</span></button>
            <button class="subtab ${ui.taskTab === 'mine' ? 'is-active' : ''}" type="button" data-action="task-tab" data-tab="mine">My Tasks <span class="count-pill">${myTasks}</span></button>
          </div>
          <label class="select-wrap"><span class="sr-only">Filter tasks by trade</span><select data-control="task-trade-filter"><option value="all">All Trades</option>${TRADE_META.map((trade) => `<option value="${escapeHtml(trade.name)}" ${ui.taskTradeFilter === trade.name ? 'selected' : ''}>${escapeHtml(trade.name)}</option>`).join('')}</select></label>
        </div>
        ${renderTaskTable(tasks)}
        ${renderTaskCards(tasks)}
      </section>
    </div>`;
}

function renderTasks() {
  const room = selectedRoom();
  const main = ui.taskView === 'trade' ? renderTradeTaskView() : `<div class="content">${renderRoomOverviewPanels(room)}</div>`;
  return `
    <div class="app-shell">
      ${renderTopbar({ title: selectedBuilding().name, subtitle: `${room.level} – Room ${room.number}`, back: '#rooms', settings: true })}
      <main class="page">
        <div class="tabs" role="tablist">
          <button class="tab ${ui.taskView === 'trade' ? 'is-active' : ''}" type="button" data-action="task-view" data-view="trade">Trade View</button>
          <button class="tab ${ui.taskView === 'turner' ? 'is-active' : ''}" type="button" data-action="task-view" data-view="turner">Turner View</button>
        </div>
        ${main}
      </main>
      ${renderBottomNav('tasks')}
      ${renderDrawer('tasks')}
    </div>`;
}
