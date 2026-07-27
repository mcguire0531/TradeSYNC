function renderModal() {
  if (!ui.modal) return '';
  const type = ui.modal.type;
  if (type === 'add-building') {
    return modalShell('Add New Building', `
      <form id="add-building-form" class="form-grid">
        <div class="field field--full"><label for="building-name">Building name</label><input class="input" id="building-name" name="name" required placeholder="Example: Downtown Office Tower" /></div>
        <div class="field field--full"><label for="building-address">Address</label><input class="input" id="building-address" name="address" required placeholder="Street, city, state" /></div>
        <div class="field"><label for="building-due">Turnover date</label><input class="input" id="building-due" name="dueDate" type="date" required value="${dateOffset(60)}" /></div>
        <div class="field"><label for="building-progress">Starting progress</label><input class="input" id="building-progress" name="progress" type="number" min="0" max="100" value="0" /></div>
      </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-building-form">Add Building</button>`);
  }
  if (type === 'add-task') {
    return modalShell(`Add Task to Room ${selectedRoom().number}`, `
      <form id="add-task-form" class="form-grid">
        <div class="field field--full"><label for="task-title">Task</label><input class="input" id="task-title" name="title" required placeholder="Describe the work to complete" /></div>
        <div class="field field--full"><label for="task-description">Details</label><textarea class="textarea" id="task-description" name="description" required placeholder="Scope, location, and acceptance criteria"></textarea></div>
        <div class="field"><label for="task-trade">Trade</label><select class="select" id="task-trade" name="trade">${TRADE_META.map((trade) => `<option>${escapeHtml(trade.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="task-assignee">Assignee</label><input class="input" id="task-assignee" name="assignee" required value="${CURRENT_USER}" /></div>
        <div class="field"><label for="task-status">Status</label><select class="select" id="task-status" name="status"><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="complete">Complete</option></select></div>
        <div class="field"><label for="task-due">Due date</label><input class="input" id="task-due" name="dueDate" type="date" required value="${dateOffset(7)}" /></div>
      </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-task-form">Add Task</button>`);
  }
  if (type === 'add-inspection') {
    return modalShell('Add Inspection', `
      <form id="add-inspection-form" class="form-grid">
        <div class="field field--full"><label for="inspection-title">Inspection</label><input class="input" id="inspection-title" name="title" required placeholder="Example: Final ceiling inspection" /></div>
        <div class="field field--full"><label for="inspection-description">Acceptance criteria</label><textarea class="textarea" id="inspection-description" name="description" required placeholder="What should the inspector verify?"></textarea></div>
        <div class="field"><label for="inspection-trade">Trade</label><select class="select" id="inspection-trade" name="trade">${[...new Set(data.inspections.map((item) => item.trade))].map((trade) => `<option ${trade === ui.inspectionTrade ? 'selected' : ''}>${escapeHtml(trade)}</option>`).join('')}</select></div>
        <div class="field"><label for="inspection-assignee">Assignee</label><input class="input" id="inspection-assignee" name="assignee" required value="M. Turner" /></div>
        <div class="field"><label for="inspection-scheduled">Scheduled</label><input class="input" id="inspection-scheduled" name="scheduled" type="date" required value="${dateOffset(3)}" /></div>
        <div class="field"><label for="inspection-result">Initial result</label><select class="select" id="inspection-result" name="status"><option value="not-inspected">Not Inspected</option><option value="passed">Passed</option><option value="failed">Failed</option></select></div>
      </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-inspection-form">Add Inspection</button>`);
  }
  if (type === 'add-constraint') {
    return modalShell('Add Constraint', `
      <form id="add-constraint-form" class="form-grid">
        <div class="field field--full"><label for="constraint-title">Constraint title</label><input class="input" id="constraint-title" name="title" required placeholder="What is blocking the work?" /></div>
        <div class="field field--full"><label for="constraint-description">Description</label><textarea class="textarea" id="constraint-description" name="description" required placeholder="Explain the impact and action needed"></textarea></div>
        <div class="field"><label for="constraint-type">Type</label><select class="select" id="constraint-type" name="type"><option>Schedule</option><option>Clash</option><option>Resource</option><option>Coordination</option><option>Design</option></select></div>
        <div class="field"><label for="constraint-priority">Priority</label><select class="select" id="constraint-priority" name="priority"><option value="critical">Critical Path</option><option value="moderate">Moderate</option><option value="low">Low</option></select></div>
        <div class="field"><label for="constraint-start">Impact starts</label><input class="input" id="constraint-start" name="startDate" type="date" required value="${dateOffset(1)}" /></div>
        <div class="field"><label for="constraint-end">Impact ends</label><input class="input" id="constraint-end" name="endDate" type="date" required value="${dateOffset(7)}" /></div>
        <div class="field field--full"><label for="constraint-owner">Owner</label><input class="input" id="constraint-owner" name="owner" required value="${CURRENT_USER}" /></div>
      </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-constraint-form">Add Constraint</button>`);
  }
  if (type === 'inspection-comment') {
    const item = data.inspections.find((inspection) => inspection.id === ui.modal.inspectionId);
    if (!item) return '';
    return modalShell('Inspection Comment', `
      <form id="inspection-comment-form">
        <input type="hidden" name="inspectionId" value="${item.id}" />
        <div class="field"><label for="inspection-comment">Comment for ${escapeHtml(item.title)}</label><textarea class="textarea" id="inspection-comment" name="comment" placeholder="Describe the correction or inspection note">${escapeHtml(item.comment)}</textarea></div>
      </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="inspection-comment-form">Save Comment</button>`);
  }
  if (type === 'messages') {
    return modalShell('Messages', `<div class="sheet-list">${data.messages.map((item) => `<article class="sheet-item"><div class="sheet-item__icon">${icon('message')}</div><div><div class="strong">${escapeHtml(item.subject)}</div><div class="tiny muted" style="margin:3px 0 7px">${escapeHtml(item.from)} · ${escapeHtml(item.time)}</div><div class="small">${escapeHtml(item.body)}</div></div></article>`).join('')}</div>`);
  }
  if (type === 'notifications') {
    return modalShell('Notifications', `<div class="sheet-list">${data.notifications.map((item) => `<article class="sheet-item"><div class="sheet-item__icon">${item.type === 'failed' || item.type === 'critical' ? icon('alert') : icon('check')}</div><div><div class="strong">${escapeHtml(item.title)}</div><div class="small muted" style="margin-top:5px">${escapeHtml(item.body)}</div></div></article>`).join('')}</div>`);
  }
  if (type === 'confirm-reset') {
    return modalShell('Reset TradeSYNC Demo?', `<p class="no-margin">This will erase every task, inspection, constraint, and building change saved in this browser. The original demonstration data will be restored.</p>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--danger" type="button" data-action="reset-demo">Reset Demo</button>`);
  }
  return '';
}

function render() {
  const current = route();
  let html = '';
  if (current.view === 'home') html = renderHome();
  else if (current.view === 'rooms') html = renderRooms();
  else if (current.view === 'room') html = renderRoomDetail();
  else if (current.view === 'tasks') html = renderTasks();
  else if (current.view === 'inspections' && current.detail) html = renderInspectionDetail();
  else if (current.view === 'inspections') html = renderInspectionSummary();
  else if (current.view === 'constraints') html = renderConstraints();
  else if (current.view === 'more') html = renderMore();
  else html = renderHome();
  document.getElementById('app').innerHTML = html;
  document.getElementById('modal-root').innerHTML = renderModal();
  document.body.style.overflow = ui.modal || ui.drawerOpen ? 'hidden' : '';
}

function openModal(type, payload = {}) {
  ui.modal = { type, ...payload };
  render();
  window.setTimeout(() => {
    const target = document.querySelector('.modal input:not([type="hidden"]), .modal select, .modal textarea');
    if (target) target.focus();
  }, 0);
}

function closeModal() {
  ui.modal = null;
  render();
}

let toastTimer = null;
function toast(message) {
  const root = document.getElementById('toast-root');
  root.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { root.innerHTML = ''; }, 3200);
}

function updateTaskStatus(taskId, status) {
  const task = roomTasks().find((item) => item.id === taskId);
  if (!task) return;
  task.status = status;
  task.completedDate = status === 'complete' ? dateOffset(0) : null;
  task.updatedBy = CURRENT_USER;
  addActivity(status === 'complete' ? 'complete' : 'progress', `${task.trade} – ${task.title} changed to ${taskStatusLabel(status)}`);
  syncRoomProgress();
  saveData();
}

function updateInspectionStatus(inspectionId, status) {
  const item = data.inspections.find((inspection) => inspection.id === inspectionId);
  if (!item) return;
  item.status = status;
  item.completed = status === 'not-inspected' ? null : dateOffset(0);
  if (status === 'passed') item.comment = '';
  if (status === 'failed' && !item.comment) item.comment = 'Correction required. Add a detailed comment before reinspection.';
  addActivity(status, `${item.trade} – ${item.title} ${status === 'not-inspected' ? 'reset to Not Inspected' : status}`);
  saveData();
  render();
  if (status === 'failed') openModal('inspection-comment', { inspectionId });
}

function completeTrade(tradeName) {
  const tasks = roomTasks().filter((task) => task.trade === tradeName);
  tasks.forEach((task) => {
    task.status = 'complete';
    task.completedDate = dateOffset(0);
    task.updatedBy = CURRENT_USER;
  });
  addActivity('complete', `${tradeName} marked Room ${selectedRoom().number} complete`);
  syncRoomProgress();
  saveData();
  render();
  toast(`${tradeName} is now 100% complete.`);
}

function reopenTrade(tradeName) {
  const tasks = roomTasks().filter((task) => task.trade === tradeName);
  const last = tasks[tasks.length - 1];
  if (last) {
    last.status = 'in-progress';
    last.completedDate = null;
    last.updatedBy = CURRENT_USER;
  }
  addActivity('progress', `${tradeName} reopened in Room ${selectedRoom().number}`);
  syncRoomProgress();
  saveData();
  render();
  toast(`${tradeName} was reopened.`);
}
