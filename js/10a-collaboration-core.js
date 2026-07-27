'use strict';

/*
 * TradeSYNC collaboration update.
 *
 * - Trade View and Turner View share the same tasks but keep indepent status records.
 * - A mismatch between the two interfaces becomes a documented task clash.
 * - Task, inspection, and constraint comments are append-only and can include images.
 * - Constraints open into a detail view and no longer use "Clash" as a constraint type.
 */

const COLLABORATION_STATUSES = new Set(['not-started', 'in-progress', 'complete']);
const COLLABORATION_MAX_IMAGES = 4;
const COLLABORATION_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const COLLABORATION_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const collaborationRenderModalBase = renderModal;
const collaborationBuildDemoDataBase = buildDemoData;
const collaborationTaskCommentsBase = taskComments;

function activeTaskInterface() {
  const isTaskPage = (location.hash || '').startsWith('#tasks');
  if (!isTaskPage) return 'turner';
  return ui.taskView === 'turner' ? 'turner' : 'trade';
}

function taskInterfaceLabel(view = activeTaskInterface()) {
  return view === 'turner' ? 'Turner View' : 'Trade View';
}

function validCollaborationStatus(status) {
  return COLLABORATION_STATUSES.has(status) ? status : 'not-started';
}

function normalizeAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  const dataUrl = String(attachment.dataUrl || '');
  if (!dataUrl.startsWith('data:image/')) return null;
  return {
    id: String(attachment.id || nextId('img')),
    name: String(attachment.name || 'Project image'),
    type: String(attachment.type || 'image/jpeg'),
    dataUrl,
    createdAt: String(attachment.createdAt || new Date().toISOString())
  };
}

function normalizeAttachments(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeAttachment).filter(Boolean);
}

function normalizeDocumentationComment(comment, fallbackAuthor = CURRENT_USER) {
  if (typeof comment === 'string') {
    return {
      id: nextId('doc'),
      author: fallbackAuthor,
      body: comment,
      createdAt: new Date().toISOString(),
      attachments: []
    };
  }
  if (!comment || typeof comment !== 'object') return null;
  comment.id = String(comment.id || nextId('doc'));
  comment.author = String(comment.author || fallbackAuthor);
  comment.body = String(comment.body || '');
  comment.createdAt = String(comment.createdAt || new Date().toISOString());
  comment.attachments = normalizeAttachments(comment.attachments);
  return comment;
}

function ensureTaskInterfaceState(task) {
  const legacyStatus = validCollaborationStatus(task.status);
  task.tradeStatus = validCollaborationStatus(task.tradeStatus || legacyStatus);
  task.turnerStatus = validCollaborationStatus(task.turnerStatus || legacyStatus);

  const legacyCompleted = task.completedDate || null;
  task.tradeCompletedDate = task.tradeStatus === 'complete'
    ? (task.tradeCompletedDate || legacyCompleted || dateOffset(0))
    : null;
  task.turnerCompletedDate = task.turnerStatus === 'complete'
    ? (task.turnerCompletedDate || legacyCompleted || dateOffset(0))
    : null;
  task.tradeUpdatedAt = task.tradeUpdatedAt || task.tradeCompletedDate || null;
  task.turnerUpdatedAt = task.turnerUpdatedAt || task.turnerCompletedDate || null;
  task.tradeUpdatedBy = task.tradeUpdatedBy || task.updatedBy || task.assignee || CURRENT_USER;
  task.turnerUpdatedBy = task.turnerUpdatedBy || task.updatedBy || task.assignee || CURRENT_USER;

  // Turner confirmation remains the canonical status used by room-level pages.
  task.status = task.turnerStatus;
  task.completedDate = task.turnerCompletedDate;
  task.updatedBy = task.turnerUpdatedBy;

  if (!Array.isArray(task.comments)) task.comments = [];
  task.comments = task.comments
    .map((comment) => normalizeDocumentationComment(comment, task.assignee || CURRENT_USER))
    .filter(Boolean);
  return task;
}

function taskCommentsWithDocumentation(task) {
  const comments = collaborationTaskCommentsBase(task);
  task.comments = comments
    .map((comment) => normalizeDocumentationComment(comment, task.assignee || CURRENT_USER))
    .filter(Boolean);
  return task.comments;
}

taskComments = taskCommentsWithDocumentation;

function inspectionCommentHistory(item) {
  if (!Array.isArray(item.commentHistory)) {
    item.commentHistory = [];
    if (String(item.comment || '').trim()) {
      item.commentHistory.push({
        id: nextId('ic'),
        author: item.assignee || CURRENT_USER,
        body: String(item.comment).trim(),
        createdAt: item.completed ? `${item.completed}T12:00:00` : new Date().toISOString(),
        attachments: []
      });
    }
  }
  item.commentHistory = item.commentHistory
    .map((comment) => normalizeDocumentationComment(comment, item.assignee || CURRENT_USER))
    .filter(Boolean);
  return item.commentHistory;
}

function constraintComments(item) {
  if (!Array.isArray(item.comments)) item.comments = [];
  item.comments = item.comments
    .map((comment) => normalizeDocumentationComment(comment, item.owner || CURRENT_USER))
    .filter(Boolean);
  return item.comments;
}

function normalizeConstraint(item) {
  if (item.type === 'Clash') item.type = 'Coordination';
  item.attachments = normalizeAttachments(item.attachments);
  constraintComments(item);
  return item;
}

function normalizeCollaborationData(target) {
  Object.values(target.tasksByRoom || {}).flat().forEach(ensureTaskInterfaceState);
  (target.inspections || []).forEach(inspectionCommentHistory);
  (target.constraints || []).forEach(normalizeConstraint);
  return target;
}

buildDemoData = function buildDemoDataWithCollaboration() {
  return normalizeCollaborationData(collaborationBuildDemoDataBase());
};

normalizeCollaborationData(data);
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not persist the collaboration data migration.', error);
}

function taskStatusForView(task, view = activeTaskInterface()) {
  ensureTaskInterfaceState(task);
  return view === 'turner' ? task.turnerStatus : task.tradeStatus;
}

function taskUpdatedAtForView(task, view = activeTaskInterface()) {
  ensureTaskInterfaceState(task);
  return view === 'turner' ? task.turnerUpdatedAt : task.tradeUpdatedAt;
}

function taskUpdatedByForView(task, view = activeTaskInterface()) {
  ensureTaskInterfaceState(task);
  return view === 'turner' ? task.turnerUpdatedBy : task.tradeUpdatedBy;
}

function setTaskStatusForView(task, status, view = activeTaskInterface()) {
  ensureTaskInterfaceState(task);
  const safeStatus = validCollaborationStatus(status);
  const now = dateOffset(0);
  if (view === 'turner') {
    task.turnerStatus = safeStatus;
    task.turnerCompletedDate = safeStatus === 'complete' ? now : null;
    task.turnerUpdatedAt = now;
    task.turnerUpdatedBy = CURRENT_USER;
  } else {
    task.tradeStatus = safeStatus;
    task.tradeCompletedDate = safeStatus === 'complete' ? now : null;
    task.tradeUpdatedAt = now;
    task.tradeUpdatedBy = CURRENT_USER;
  }
  task.status = task.turnerStatus;
  task.completedDate = task.turnerCompletedDate;
  task.updatedBy = task.turnerUpdatedBy;
}

function taskHasStatusClash(task) {
  ensureTaskInterfaceState(task);
  return task.tradeStatus !== task.turnerStatus;
}

function roomTaskClashes(roomId = ui.selectedRoomId) {
  return roomTasks(roomId).filter(taskHasStatusClash);
}

function tradeStatusClashCount(tradeName, roomId = ui.selectedRoomId) {
  return roomTaskClashes(roomId).filter((task) => task.trade === tradeName).length;
}

function collaborationTradeSummary(tradeName, roomId = ui.selectedRoomId, view = activeTaskInterface()) {
  const tasks = roomTasks(roomId).filter((task) => task.trade === tradeName);
  const complete = tasks.filter((task) => taskStatusForView(task, view) === 'complete').length;
  const inProgress = tasks.filter((task) => taskStatusForView(task, view) === 'in-progress').length;
  const percent = tasks.length ? Math.round((complete / tasks.length) * 100) : 0;
  let status = 'not-started';
  if (tasks.length && complete === tasks.length) status = 'complete';
  else if (complete > 0 || inProgress > 0) status = 'in-progress';

  const meta = TRADE_META.find((item) => item.name === tradeName) || {
    name: tradeName,
    symbol: '•',
    assignee: 'Unassigned'
  };
  const lastTask = [...tasks].sort((a, b) => String(taskUpdatedAtForView(b, view) || b.dueDate).localeCompare(String(taskUpdatedAtForView(a, view) || a.dueDate)))[0];
  return {
    ...meta,
    total: tasks.length,
    complete,
    percent,
    status,
    conflicts: tradeStatusClashCount(tradeName, roomId),
    lastUpdated: lastTask ? taskUpdatedAtForView(lastTask, view) : null,
    updatedBy: lastTask ? taskUpdatedByForView(lastTask, view) : meta.assignee
  };
}

tradeSummary = function tradeSummaryByActiveInterface(tradeName, roomId = ui.selectedRoomId) {
  return collaborationTradeSummary(tradeName, roomId, activeTaskInterface());
};

roomTrades = function roomTradesByActiveInterface(roomId = ui.selectedRoomId) {
  return TRADE_META.map((trade) => collaborationTradeSummary(trade.name, roomId, activeTaskInterface()));
};

syncRoomProgress = function syncRoomProgressFromTurnerConfirmation(roomId = ui.selectedRoomId, persist = true) {
  const trades = TRADE_META.map((trade) => collaborationTradeSummary(trade.name, roomId, 'turner'));
  const completed = trades.filter((trade) => trade.status === 'complete').length;
  const percent = Math.round((completed / trades.length) * 100);
  const room = data.rooms.find((item) => item.id === roomId);
  if (room) {
    room.progress = percent;
    room.status = percent === 100 ? 'complete' : percent === 0 ? 'not-started' : 'incomplete';
    room.statusClashes = roomTaskClashes(roomId).length;
  }
  if (roomId === '205') {
    const building = data.buildings.find((item) => item.id === 'riverside');
    if (building) building.progress = Math.round((building.progress * 3 + percent) / 4);
  }
  if (persist) saveData();
  return percent;
};

visibleTasks = function visibleTasksByActiveInterface() {
  let tasks = roomTasks();
  if (ui.taskTab === 'incomplete') tasks = tasks.filter((task) => taskStatusForView(task) !== 'complete');
  if (ui.taskTab === 'mine') tasks = tasks.filter((task) => task.assignee === CURRENT_USER);
  if (ui.taskTradeFilter !== 'all') tasks = tasks.filter((task) => task.trade === ui.taskTradeFilter);
  return tasks;
};

taskStatusSelect = function taskStatusSelectByInterface(task) {
  const status = taskStatusForView(task);
  const label = taskInterfaceLabel();
  return `<select class="table-select" data-control="task-status" data-task="${escapeHtml(task.id)}" data-interface="${activeTaskInterface()}" aria-label="Change ${escapeHtml(label)} status for ${escapeHtml(task.title)}"><option value="not-started" ${status === 'not-started' ? 'selected' : ''}>Not Started</option><option value="in-progress" ${status === 'in-progress' ? 'selected' : ''}>In Progress</option><option value="complete" ${status === 'complete' ? 'selected' : ''}>Complete</option></select>`;
};

function renderTaskClashBadge(task, compact = false) {
  if (!taskHasStatusClash(task)) return '';
  return `<button class="status-clash-badge ${compact ? 'status-clash-badge--compact' : ''}" type="button" data-action="open-clashes" aria-label="Open status clash details">${icon('bolt')}<span>${compact ? '' : 'Clash'}</span></button>`;
}

function renderTradeClashBadge(trade) {
  if (!trade.conflicts) return '';
  return `<span class="trade-clash-count">${icon('bolt')} ${trade.conflicts} clash${trade.conflicts === 1 ? '' : 'es'}</span>`;
}

