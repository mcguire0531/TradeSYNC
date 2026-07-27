'use strict';

/*
 * Task workspace enhancements requested for the first TradeSYNC update.
 * This file intentionally loads after the original prototype scripts so the
 * new task experience can extend the working app without disturbing the
 * other screens.
 */

const tradeSyncOriginalRenderModal = renderModal;

function taskComments(task) {
  if (!Array.isArray(task.comments)) task.comments = [];
  return task.comments;
}

function taskCommentCount(task) {
  return taskComments(task).length;
}

function formatCommentTime(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function findTask(taskId) {
  for (const tasks of Object.values(data.tasksByRoom || {})) {
    const task = tasks.find((item) => item.id === taskId);
    if (task) return task;
  }
  return null;
}

function renderTaskLocationSelector() {
  const building = selectedBuilding();
  const room = selectedRoom();
  const rooms = data.rooms;
  return `
    <section class="task-context" aria-label="Task location selection">
      <div class="task-context__heading">
        <div class="task-context__eyebrow">Working location</div>
        <div class="task-context__summary">${escapeHtml(room.level)} · ${escapeHtml(room.name)} · ${escapeHtml(room.location)}</div>
      </div>
      <div class="task-context__controls">
        <label class="task-context__field">
          <span>Building</span>
          <select class="task-context__select" data-control="task-building-selector" aria-label="Select building">
            ${data.buildings.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === building.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}
          </select>
        </label>
        <label class="task-context__field task-context__field--room">
          <span>Room</span>
          <select class="task-context__select" data-control="task-room-selector" aria-label="Select room">
            ${rooms.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === room.id ? 'selected' : ''}>Room ${escapeHtml(item.number)} — ${escapeHtml(item.name)}</option>`).join('')}
          </select>
        </label>
      </div>
    </section>`;
}

function renderTradeTaskOpenButton(tradeName, compact = false) {
  return `<button class="trade-open-button ${compact ? 'trade-open-button--compact' : ''}" type="button" data-action="open-trade-tasks" data-trade="${escapeHtml(tradeName)}" aria-label="Open ${escapeHtml(tradeName)} tasks">${compact ? icon('chevron') : `${icon('tasks')}<span>Open tasks</span>`}</button>`;
}

renderTradeRows = function renderTradeRowsWithTaskAccess(trades) {
  return trades.map((trade) => `
    <tr class="trade-row--interactive" data-action="open-trade-tasks" data-trade="${escapeHtml(trade.name)}">
      <td>
        <button class="trade-cell trade-cell--button" type="button" data-action="open-trade-tasks" data-trade="${escapeHtml(trade.name)}">
          ${tradeIcon(trade.name)}
          <span><span class="strong trade-link-label">${escapeHtml(trade.name)}</span><span class="small muted trade-task-count">${trade.complete} / ${trade.total} tasks</span></span>
        </button>
      </td>
      <td><div class="status-line">${statusIcon(trade.status)}${tradeStatusCopy(trade)}</div></td>
      <td>${trade.status === 'in-progress'
        ? `<div class="inline-progress"><strong>${trade.percent}%</strong>${makeProgress(trade.percent, 'var(--orange)')}</div>`
        : `<strong>${trade.percent}%</strong>`}</td>
      <td>${trade.lastUpdated ? formatDate(trade.lastUpdated) : '—'}</td>
      <td>
        <div class="trade-actions">
          ${renderTradeTaskOpenButton(trade.name)}
          ${trade.status === 'complete'
            ? `<button class="button button--secondary button--small" type="button" data-action="reopen-trade" data-trade="${escapeHtml(trade.name)}">Reopen</button>`
            : `<button class="button button--primary button--small" type="button" data-action="complete-trade" data-trade="${escapeHtml(trade.name)}">Mark Complete</button>`}
        </div>
      </td>
    </tr>`).join('');
};

renderTradeCards = function renderTradeCardsWithTaskAccess(trades) {
  return trades.map((trade) => `
    <article class="mobile-row-card trade-mobile-card" data-action="open-trade-tasks" data-trade="${escapeHtml(trade.name)}">
      <div class="mobile-row-card__head">
        <button class="trade-cell trade-cell--button" type="button" data-action="open-trade-tasks" data-trade="${escapeHtml(trade.name)}">
          ${tradeIcon(trade.name)}
          <span><strong class="trade-link-label">${escapeHtml(trade.name)}</strong><span class="small muted trade-task-count">${trade.complete} / ${trade.total} tasks</span></span>
        </button>
        <div class="trade-mobile-card__progress"><strong>${trade.percent}%</strong>${renderTradeTaskOpenButton(trade.name, true)}</div>
      </div>
      <div class="mobile-row-card__body"><div class="status-line">${statusIcon(trade.status)}${tradeStatusCopy(trade)}</div>${trade.status === 'in-progress' ? makeProgress(trade.percent, 'var(--orange)') : ''}</div>
      <div class="mobile-row-card__foot">
        <span class="small muted">Updated ${trade.lastUpdated ? formatDate(trade.lastUpdated) : '—'}</span>
        ${trade.status === 'complete'
          ? `<button class="button button--secondary button--small" type="button" data-action="reopen-trade" data-trade="${escapeHtml(trade.name)}">Reopen</button>`
          : `<button class="button button--primary button--small" type="button" data-action="complete-trade" data-trade="${escapeHtml(trade.name)}">Mark Complete</button>`}
      </div>
    </article>`).join('');
};

function renderTaskCommentButton(task, compact = false) {
  const count = taskCommentCount(task);
  return `<button class="task-comment-button ${compact ? 'task-comment-button--compact' : ''}" type="button" data-action="open-task-comments" data-task="${escapeHtml(task.id)}" aria-label="Open comments for ${escapeHtml(task.title)}">${icon('comment')}<span>${compact ? '' : 'Comments'}</span><span class="task-comment-count">${count}</span></button>`;
}

renderTaskTable = function renderTaskTableWithComments(tasks) {
  const rows = tasks.map((task) => `
    <tr>
      <td><div class="task-title"><div class="task-title__name">${escapeHtml(task.title)}</div><div class="task-title__description">${escapeHtml(task.description)}</div></div></td>
      <td><div class="trade-cell">${tradeIcon(task.trade)}<span>${escapeHtml(task.trade)}</span></div></td>
      <td>${taskStatusSelect(task)}</td>
      <td>${escapeHtml(task.assignee)}</td>
      <td>${formatDate(task.dueDate)}</td>
      <td>${renderTaskCommentButton(task)}</td>
    </tr>`).join('');
  return `<div class="table-wrap table-wrap--responsive"><table class="data-table"><thead><tr><th>Task</th><th>Trade</th><th>Status</th><th>Assignee</th><th>Due Date</th><th>Comments</th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="empty-state">No tasks match this view.</div></td></tr>`}</tbody></table></div>`;
};

renderTaskCards = function renderTaskCardsWithComments(tasks) {
  return `<div class="mobile-card-list">${tasks.map((task) => `
    <article class="mobile-row-card">
      <div class="mobile-row-card__head"><strong>${escapeHtml(task.title)}</strong>${tradeIcon(task.trade)}</div>
      <p class="muted small" style="margin:8px 0 0">${escapeHtml(task.description)}</p>
      <div class="mobile-row-card__body">
        <div><div class="mobile-row-card__label">Trade</div><div class="mobile-row-card__value">${escapeHtml(task.trade)}</div></div>
        <div><div class="mobile-row-card__label">Assignee</div><div class="mobile-row-card__value">${escapeHtml(task.assignee)}</div></div>
        <div><div class="mobile-row-card__label">Due</div><div class="mobile-row-card__value">${formatDate(task.dueDate)}</div></div>
      </div>
      <div class="mobile-row-card__foot task-card-actions">
        ${taskStatusSelect(task)}
        ${renderTaskCommentButton(task)}
      </div>
    </article>`).join('') || `<div class="empty-state">No tasks match this view.</div>`}</div>`;
};

renderTasks = function renderTasksWithLocationSelectors() {
  const room = selectedRoom();
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Tasks', subtitle: `${selectedBuilding().name} · Room ${room.number}`, back: '#rooms', settings: true })}
      <main class="page">
        ${renderTaskLocationSelector()}
        <div class="tabs" role="tablist" aria-label="Task view">
          <button class="tab ${ui.taskView === 'trade' ? 'is-active' : ''}" type="button" data-action="task-view" data-view="trade" role="tab" aria-selected="${ui.taskView === 'trade'}">Trade View</button>
          <button class="tab ${ui.taskView === 'turner' ? 'is-active' : ''}" type="button" data-action="task-view" data-view="turner" role="tab" aria-selected="${ui.taskView === 'turner'}">Turner View</button>
        </div>
        ${renderTradeTaskView()}
      </main>
      ${renderBottomNav('tasks')}
      ${renderDrawer('tasks')}
    </div>`;
};

function renderTradeTaskModal() {
  const tradeName = ui.modal?.trade;
  const room = selectedRoom();
  const trade = roomTrades().find((item) => item.name === tradeName);
  if (!trade) return '';
  const tasks = roomTasks().filter((task) => task.trade === tradeName);
  const taskList = tasks.length
    ? `<div class="trade-task-modal-list">${tasks.map((task) => `
        <article class="trade-task-modal-item">
          <div class="trade-task-modal-item__top">
            <div><div class="strong">${escapeHtml(task.title)}</div><div class="small muted">${escapeHtml(task.description)}</div></div>
            ${taskStatusMarkup(task.status)}
          </div>
          <div class="trade-task-modal-item__meta"><span>Assigned to ${escapeHtml(task.assignee)}</span><span>Due ${formatDate(task.dueDate)}</span>${renderTaskCommentButton(task, true)}</div>
        </article>`).join('')}</div>`
    : `<div class="empty-state"><div class="empty-state__icon">${icon('tasks')}</div><strong>No ${escapeHtml(tradeName)} tasks in this room yet.</strong><p class="muted small no-margin">Add the first task for this trade.</p></div>`;

  const body = `
    <div class="trade-task-modal-summary">
      ${tradeIcon(tradeName)}
      <div><div class="strong">Room ${escapeHtml(room.number)} · ${escapeHtml(room.name)}</div><div class="small muted">${trade.complete} of ${trade.total} tasks complete · ${trade.percent}%</div></div>
    </div>
    ${makeProgress(trade.percent, trade.status === 'complete' ? 'var(--green)' : trade.status === 'in-progress' ? 'var(--orange)' : '#dfe4ee')}
    ${taskList}`;

  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="button" data-action="open-add-task" data-trade="${escapeHtml(tradeName)}">${icon('plus')}Add ${escapeHtml(tradeName)} Task</button>`;
  return modalShell(`${tradeName} Tasks`, body, footer);
}

function renderEnhancedAddTaskModal() {
  const preferredTrade = ui.modal?.trade || ui.taskTradeFilter;
  const selectedTrade = preferredTrade && preferredTrade !== 'all' ? preferredTrade : TRADE_META[0].name;
  return modalShell(`Add Task to Room ${selectedRoom().number}`, `
    <form id="add-task-form" class="form-grid">
      <div class="field field--full"><label for="task-title">Task</label><input class="input" id="task-title" name="title" required placeholder="Describe the work to complete" /></div>
      <div class="field field--full"><label for="task-description">Details</label><textarea class="textarea" id="task-description" name="description" required placeholder="Scope, location, and acceptance criteria"></textarea></div>
      <div class="field"><label for="task-trade">Trade</label><select class="select" id="task-trade" name="trade">${TRADE_META.map((trade) => `<option value="${escapeHtml(trade.name)}" ${trade.name === selectedTrade ? 'selected' : ''}>${escapeHtml(trade.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="task-assignee">Assignee</label><input class="input" id="task-assignee" name="assignee" required value="${escapeHtml(TRADE_META.find((trade) => trade.name === selectedTrade)?.assignee || CURRENT_USER)}" /></div>
      <div class="field"><label for="task-status">Status</label><select class="select" id="task-status" name="status"><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="complete">Complete</option></select></div>
      <div class="field"><label for="task-due">Due date</label><input class="input" id="task-due" name="dueDate" type="date" required value="${dateOffset(7)}" /></div>
      <div class="field field--full"><label for="task-initial-comment">Initial comment <span class="muted">(optional)</span></label><textarea class="textarea" id="task-initial-comment" name="comment" placeholder="Add a coordination note, question, or instruction for this task"></textarea><div class="field-help">Additional comments can be added from the task list at any time.</div></div>
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-task-form">Add Task</button>`);
}

function renderTaskCommentsModal() {
  const task = findTask(ui.modal?.taskId);
  if (!task) return '';
  const comments = taskComments(task);
  const thread = comments.length
    ? `<div class="comment-thread">${comments.map((comment) => `
        <article class="task-comment">
          <div class="task-comment__avatar">${escapeHtml((comment.author || 'U').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase())}</div>
          <div class="task-comment__content"><div class="task-comment__meta"><strong>${escapeHtml(comment.author || CURRENT_USER)}</strong><span>${formatCommentTime(comment.createdAt)}</span></div><p>${escapeHtml(comment.body)}</p></div>
        </article>`).join('')}</div>`
    : `<div class="empty-state empty-state--comments"><div class="empty-state__icon">${icon('comment')}</div><strong>No comments yet.</strong><p class="muted small no-margin">Add the first coordination note for this task.</p></div>`;

  const body = `
    <div class="task-comment-context">
      <div class="trade-cell">${tradeIcon(task.trade)}<div><div class="strong">${escapeHtml(task.title)}</div><div class="small muted">${escapeHtml(task.trade)} · Room ${escapeHtml(task.roomId)}</div></div></div>
      ${taskStatusMarkup(task.status)}
    </div>
    ${thread}
    <form id="task-comment-form" class="task-comment-form">
      <input type="hidden" name="taskId" value="${escapeHtml(task.id)}" />
      <div class="field"><label for="task-comment-body">Add comment</label><textarea class="textarea" id="task-comment-body" name="body" required placeholder="Type a comment, question, or update"></textarea></div>
    </form>`;
  return modalShell(`Task Comments (${comments.length})`, body, `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="submit" form="task-comment-form">${icon('comment')}Add Comment</button>`);
}

renderModal = function renderModalWithTaskEnhancements() {
  if (!ui.modal) return '';
  if (ui.modal.type === 'trade-tasks') return renderTradeTaskModal();
  if (ui.modal.type === 'add-task') return renderEnhancedAddTaskModal();
  if (ui.modal.type === 'task-comments') return renderTaskCommentsModal();
  return tradeSyncOriginalRenderModal();
};

function addTaskFromEnhancedForm(formData) {
  const status = String(formData.get('status'));
  const task = makeTask(
    nextId('t'),
    ui.selectedRoomId,
    String(formData.get('trade')),
    String(formData.get('title')).trim(),
    String(formData.get('description')).trim(),
    status,
    String(formData.get('assignee')).trim(),
    String(formData.get('dueDate')),
    status === 'complete' ? dateOffset(0) : null
  );
  task.comments = [];
  const initialComment = String(formData.get('comment') || '').trim();
  if (initialComment) {
    task.comments.push({ id: nextId('tc'), author: CURRENT_USER, body: initialComment, createdAt: new Date().toISOString() });
  }
  roomTasks().push(task);
  addActivity(status === 'complete' ? 'complete' : 'progress', `${task.trade} – ${task.title} added`);
  syncRoomProgress();
  saveData();
  ui.modal = null;
  render();
  toast(initialComment ? 'Task and comment added to the room.' : 'Task added to the room.');
}

function addCommentFromForm(formData) {
  const task = findTask(String(formData.get('taskId')));
  const body = String(formData.get('body') || '').trim();
  if (!task || !body) return;
  taskComments(task).push({ id: nextId('tc'), author: CURRENT_USER, body, createdAt: new Date().toISOString() });
  addActivity('progress', `${task.trade} – comment added to ${task.title}`);
  saveData();
  ui.modal = { type: 'task-comments', taskId: task.id };
  render();
  toast('Task comment added.');
}

// Capture-phase handlers run before the original prototype handlers. They only
// intercept the new task-specific interactions and leave every other screen
// and action on the original event path.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'open-trade-tasks') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('trade-tasks', { trade: trigger.dataset.trade });
  } else if (action === 'open-add-task') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('add-task', { trade: trigger.dataset.trade || ui.modal?.trade || '' });
  } else if (action === 'open-task-comments') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('task-comments', { taskId: trigger.dataset.task });
  }
}, true);

document.addEventListener('change', (event) => {
  const control = event.target.dataset.control;
  if (control === 'task-building-selector') {
    event.stopImmediatePropagation();
    ui.selectedBuildingId = event.target.value;
    render();
    toast(`Building changed to ${selectedBuilding().name}.`);
  } else if (control === 'task-room-selector') {
    event.stopImmediatePropagation();
    ui.selectedRoomId = event.target.value;
    ensureRoomWorkspace(ui.selectedRoomId);
    ui.taskTradeFilter = 'all';
    ui.taskTab = 'all';
    history.replaceState(null, '', `#tasks/${encodeURIComponent(ui.selectedRoomId)}`);
    render();
    toast(`Room ${selectedRoom().number} selected.`);
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'add-task-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    addTaskFromEnhancedForm(new FormData(form));
  } else if (form.id === 'task-comment-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    addCommentFromForm(new FormData(form));
  }
}, true);

// Normalize comments for tasks already saved in a browser from the first app
// version. This preserves the user's existing local prototype data.
Object.values(data.tasksByRoom || {}).flat().forEach(taskComments);
saveData();

if (route().view === 'tasks') render();
