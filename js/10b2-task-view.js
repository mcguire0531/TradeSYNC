function renderTaskClashAlert(conflicts) {
  if (!conflicts.length) return '';
  const room = selectedRoom();
  const tradeDone = TRADE_META.every((trade) => collaborationTradeSummary(trade.name, room.id, 'trade').status === 'complete');
  const turnerDone = TRADE_META.every((trade) => collaborationTradeSummary(trade.name, room.id, 'turner').status === 'complete');
  const roomConflict = tradeDone !== turnerDone;
  return `
    <button class="task-clash-alert section" type="button" data-action="open-clashes">
      <span class="task-clash-alert__icon">${icon('bolt')}</span>
      <span class="task-clash-alert__copy"><strong>${conflicts.length} status clash${conflicts.length === 1 ? '' : 'es'} need review</strong><span>${roomConflict ? 'Trade View and Turner View disagree on whether this room is complete. ' : ''}Open the clash record to compare both interfaces.</span></span>
      <span class="task-clash-alert__action">Review ${icon('chevron')}</span>
    </button>`;
}

renderTradeTaskView = function renderTradeTaskViewWithIndependentInterfaces() {
  const room = selectedRoom();
  const trades = roomTrades();
  const complete = trades.filter((trade) => trade.status === 'complete').length;
  const inProgress = trades.filter((trade) => trade.status === 'in-progress').length;
  const notStarted = trades.filter((trade) => trade.status === 'not-started').length;
  const progress = Math.round((complete / trades.length) * 100);
  const tasks = visibleTasks();
  const allTasks = roomTasks();
  const incomplete = allTasks.filter((task) => taskStatusForView(task) !== 'complete').length;
  const myTasks = allTasks.filter((task) => task.assignee === CURRENT_USER).length;
  const conflicts = roomTaskClashes();
  const totalClashes = Number(room.clashes || 0) + conflicts.length;
  const viewLabel = taskInterfaceLabel();
  const message = activeTaskInterface() === 'turner'
    ? 'Turner independently verifies each trade and task before accepting room completion.'
    : 'Each trade independently marks its work and tasks complete when its scope is finished.';

  return `
    <div class="content">
      <section class="room-completion-card section">
        <div class="room-completion-card__message">
          <div class="room-completion-card__check">${icon('check')}</div>
          <div><div class="interface-record-label">${escapeHtml(viewLabel)} record</div><h2>${message}</h2><p class="muted no-margin">Tasks are shared between both interfaces, but completion decisions remain separate.</p></div>
        </div>
        <div class="room-completion-card__progress">
          <div class="progress-heading"><strong>${escapeHtml(viewLabel)} Room Progress</strong><span>${progress}% Complete</span></div>
          ${makeProgress(progress, 'var(--green)')}
          <p class="no-margin" style="margin-top:12px">${complete} of ${trades.length} trades complete</p>
        </div>
      </section>

      ${renderTaskClashAlert(conflicts)}

      <section class="stats-grid section">
        <div class="stat-card"><span class="stat-card__icon icon-green">${icon('check')}</span><div><div class="stat-card__value">${complete}</div><div class="stat-card__label">Complete</div></div></div>
        <div class="stat-card"><span class="stat-card__icon icon-orange"></span><div><div class="stat-card__value">${inProgress}</div><div class="stat-card__label">In Progress</div></div></div>
        <div class="stat-card"><span class="stat-card__icon icon-navy">${icon('minus')}</span><div><div class="stat-card__value">${notStarted}</div><div class="stat-card__label">Not Started</div></div></div>
        <div class="stat-card"><span class="stat-card__icon icon-navy">${icon('calendar')}</span><div><div class="stat-card__value">${trades.length}</div><div class="stat-card__label">Total Trades</div></div></div>
        <button class="stat-card" type="button" data-action="open-clashes" style="cursor:pointer"><span class="stat-card__icon icon-orange">${icon('bolt')}</span><div><div class="stat-card__value">${totalClashes}</div><div class="stat-card__label">Clashes</div></div></button>
      </section>

      <section class="section">
        <div class="section-head"><h2>Trades</h2><div class="small muted">${escapeHtml(viewLabel)} · ${complete} complete · ${inProgress} in progress · ${notStarted} not started</div></div>
        <div class="table-wrap table-wrap--responsive"><table class="data-table"><thead><tr><th>Trade</th><th>Status</th><th>Completed</th><th>Last Updated</th><th></th></tr></thead><tbody>${renderTradeRows(trades)}</tbody></table></div>
        <div class="mobile-card-list">${renderTradeCards(trades)}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Tasks for Room ${escapeHtml(room.number)}</h2><button class="button button--ghost" type="button" data-action="open-add-task">${icon('plus')}Add Task</button></div>
        <div class="shared-task-note">${icon('tasks')} Tasks added in either interface automatically appear in both Trade View and Turner View.</div>
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
};

