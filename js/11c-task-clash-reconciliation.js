'use strict';

/* Individual task controls, real clash reconciliation, and forced Trade View navigation. */

const taskClashRoomOverviewBase = renderRoomOverviewPanels;
const taskClashTradeTaskViewBase = renderTradeTaskView;

renderRoomOverviewPanels = function renderRoomOverviewWithActualClashes(room) {
  const storedClashes = room.clashes;
  room.clashes = roomTaskClashes(room.id).length;
  let html;
  try {
    html = taskClashRoomOverviewBase(room);
  } finally {
    room.clashes = storedClashes;
  }
  return html.replace(
    `data-action="go" data-hash="#tasks/${room.id}"`,
    `data-action="open-trade-view" data-room="${escapeHtml(room.id)}"`
  );
};

renderTradeTaskView = function renderTradeTaskViewWithActualClashCount() {
  const room = selectedRoom();
  const storedClashes = room.clashes;
  room.clashes = 0;
  try {
    return taskClashTradeTaskViewBase();
  } finally {
    room.clashes = storedClashes;
  }
};

function otherTaskInterface(view = activeTaskInterface()) {
  return view === 'trade' ? 'turner' : 'trade';
}

renderTradeTaskModal = function renderTradeTaskModalWithIndividualStatusControls() {
  const tradeName = ui.modal?.trade;
  const room = selectedRoom();
  const trade = roomTrades().find((item) => item.name === tradeName);
  if (!trade) return '';
  const currentView = activeTaskInterface();
  const otherView = otherTaskInterface(currentView);
  const tasks = roomTasks().filter((task) => task.trade === tradeName);
  const taskList = tasks.length
    ? `<div class="trade-task-modal-list">${tasks.map((task) => {
        const otherStatus = taskStatusForView(task, otherView);
        return `
          <article class="trade-task-modal-item trade-task-modal-item--editable ${taskHasStatusClash(task) ? 'task-row--clash' : ''}">
            <div class="trade-task-modal-item__top">
              <div><div class="strong">${escapeHtml(task.title)} ${renderTaskClashBadge(task, true)}</div><div class="small muted">${escapeHtml(task.description)}</div></div>
              <div class="trade-task-status-editor"><label>${escapeHtml(taskInterfaceLabel(currentView))} status</label>${taskStatusSelect(task)}</div>
            </div>
            <div class="trade-task-modal-item__comparison"><span>Other interface: <strong>${escapeHtml(taskInterfaceLabel(otherView))}</strong></span>${taskStatusMarkup(otherStatus)}</div>
            <div class="trade-task-modal-item__meta"><span>Assigned to ${escapeHtml(task.assignee)}</span><span>Due ${formatDate(task.dueDate)}</span>${renderTaskCommentButton(task, true)}</div>
          </article>`;
      }).join('')}</div>`
    : `<div class="empty-state"><div class="empty-state__icon">${icon('tasks')}</div><strong>No ${escapeHtml(tradeName)} tasks in this room yet.</strong><p class="muted small no-margin">Add the first task. It will appear in both interfaces.</p></div>`;

  const body = `
    <div class="trade-task-modal-summary">${tradeIcon(tradeName)}<div><div class="strong">${escapeHtml(taskInterfaceLabel(currentView))} · Room ${escapeHtml(room.number)} · ${escapeHtml(room.name)}</div><div class="small muted">${trade.complete} of ${trade.total} tasks complete · ${trade.percent}%${trade.conflicts ? ` · ${trade.conflicts} real clash${trade.conflicts === 1 ? '' : 'es'}` : ''}</div></div></div>
    ${makeProgress(trade.percent, trade.status === 'complete' ? 'var(--green)' : trade.status === 'in-progress' ? 'var(--orange)' : '#dfe4ee')}
    <div class="individual-task-status-note">Change any task below. The status changes only in ${escapeHtml(taskInterfaceLabel(currentView))}; if the other interface disagrees, TradeSYNC creates a real clash that must be reconciled.</div>
    ${taskList}`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="button" data-action="open-add-task" data-trade="${escapeHtml(tradeName)}">${icon('plus')}Add ${escapeHtml(tradeName)} Task</button>`;
  return modalShell(`${tradeName} Tasks`, body, footer);
};

function renderClashCorrectionButtons(task) {
  return `
    <div class="clash-correction-actions">
      <button class="button button--secondary" type="button" data-action="correct-task-clash" data-task="${escapeHtml(task.id)}" data-source="trade">Use Trade View status</button>
      <button class="button button--primary" type="button" data-action="correct-task-clash" data-task="${escapeHtml(task.id)}" data-source="turner">Use Turner View status</button>
    </div>`;
}

renderClashModal = function renderCorrectableClashModal() {
  const room = selectedRoom();
  const conflicts = roomTaskClashes(room.id);
  const tradeComplete = TRADE_META.filter((trade) => collaborationTradeSummary(trade.name, room.id, 'trade').status === 'complete').length;
  const turnerComplete = TRADE_META.filter((trade) => collaborationTradeSummary(trade.name, room.id, 'turner').status === 'complete').length;
  const list = conflicts.length
    ? `<div class="clash-record-list">${conflicts.map((task) => `
        <article class="clash-record clash-record--correctable">
          <div class="clash-record__icon">${icon('bolt')}</div>
          <div class="clash-record__body">
            <div class="strong">${escapeHtml(task.title)}</div>
            <div class="small muted">${escapeHtml(task.trade)} · Room ${escapeHtml(task.roomId)}</div>
            <div class="clash-status-compare"><div><span>Trade View</span>${taskStatusMarkup(task.tradeStatus)}</div><div><span>Turner View</span>${taskStatusMarkup(task.turnerStatus)}</div></div>
            <p class="clash-correction-help">Choose which verified status should be applied to both records. The clash disappears only after the stored statuses match.</p>
            ${renderClashCorrectionButtons(task)}
          </div>
          ${renderTaskCommentButton(task, true)}
        </article>`).join('')}</div>`
    : `<div class="empty-state"><div class="empty-state__icon">${icon('check')}</div><strong>No unresolved task clashes.</strong><p class="muted small no-margin">Trade View and Turner View currently agree on every shared task.</p></div>`;
  const body = `
    <div class="clash-room-summary"><div><span>Trade View</span><strong>${tradeComplete} of ${TRADE_META.length} trades complete</strong></div><div><span>Turner View</span><strong>${turnerComplete} of ${TRADE_META.length} trades complete</strong></div></div>
    <div class="actual-clash-note">${icon('bolt')} Clash records below are calculated from the saved Trade View and Turner View task statuses. They are not sample counters.</div>
    ${list}`;
  return modalShell(`Room ${room.number} Clashes (${conflicts.length})`, body, `<button class="button button--primary" type="button" data-action="close-modal">Close</button>`);
};

function correctTaskClash(taskId, source) {
  const task = findTask(taskId);
  if (!task || !taskHasStatusClash(task)) {
    toast('This task no longer has a clash.');
    return;
  }
  const sourceView = source === 'trade' ? 'trade' : 'turner';
  const chosenStatus = taskStatusForView(task, sourceView);
  setTaskStatusForView(task, chosenStatus, 'trade');
  setTaskStatusForView(task, chosenStatus, 'turner');
  taskComments(task).push({
    id: nextId('tc'),
    author: CURRENT_USER,
    body: `Status clash corrected. ${taskInterfaceLabel(sourceView)} status (${taskStatusLabel(chosenStatus)}) was applied to both interfaces.`,
    createdAt: new Date().toISOString(),
    attachments: []
  });
  addActivity('complete', `${task.trade} – ${task.title} clash corrected using ${taskInterfaceLabel(sourceView)}`);
  syncRoomProgress(task.roomId, false);
  saveData();
  ui.modal = { type: 'clashes' };
  render();
  toast(`Clash corrected. Both interfaces now show ${taskStatusLabel(chosenStatus)}.`);
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'open-trade-view') {
    event.preventDefault();
    event.stopImmediatePropagation();
    ui.taskView = 'trade';
    ui.selectedRoomId = trigger.dataset.room || ui.selectedRoomId;
    ensureRoomWorkspace(ui.selectedRoomId);
    go(`#tasks/${encodeURIComponent(ui.selectedRoomId)}`);
  } else if (action === 'correct-task-clash') {
    event.preventDefault();
    event.stopImmediatePropagation();
    correctTaskClash(trigger.dataset.task, trigger.dataset.source);
  }
}, true);

if (route().view === 'room' || route().view === 'tasks') render();
