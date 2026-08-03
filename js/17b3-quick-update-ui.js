'use strict';

function quickUpdateContext() {
  const context = ui.quickUpdateContext || {};
  let building = data.buildings.find((item) => item.id === context.buildingId) || selectedBuilding() || data.buildings[0];
  if (!building) return { building: null, rooms: [], room: null, trade: TRADE_META[0]?.name || 'Electrical', tasks: [] };
  let rooms = projectRoomsForBuilding(building.id);
  let room = rooms.find((item) => item.id === context.roomId) || rooms.find((item) => item.id === ui.selectedRoomId) || rooms[0] || null;
  const trade = TRADE_META.some((item) => item.name === context.trade) ? context.trade : (TRADE_META[0]?.name || 'Electrical');
  const tasks = room ? roomTasks(room.id).filter((task) => task.trade === trade) : [];
  let taskId = context.taskId;
  if (taskId !== '__trade__' && !tasks.some((task) => task.id === taskId)) {
    taskId = tasks.find((task) => taskStatusForView(task, context.role === 'trade' ? 'trade' : 'turner') !== 'complete')?.id || tasks[0]?.id || '__trade__';
  }
  return { building, rooms, room, trade, tasks, taskId, role: context.role === 'trade' ? 'trade' : 'turner', status: validCollaborationStatus(context.status || 'complete') };
}

function renderQuickUpdateModal() {
  const context = quickUpdateContext();
  if (!context.building) return '';
  const projectCode = context.building.accessCode || 'Project access';
  const taskOptions = [`<option value="__trade__" ${context.taskId === '__trade__' ? 'selected' : ''}>Entire ${escapeHtml(context.trade)} scope</option>`, ...context.tasks.map((task) => `<option value="${escapeHtml(task.id)}" ${task.id === context.taskId ? 'selected' : ''}>${escapeHtml(task.title)}</option>`)].join('');
  return modalShell('Quick Update', `
    <form id="quick-update-form" class="form-grid" data-comment-submit-label="Submit Update">
      <div class="quick-update-intro field--full"><span>${icon('bolt')}</span><div><strong>One simple field update</strong><small>Choose context, tap a status, add proof, and submit.</small></div></div>
      <div class="field field--full"><label>Updating as</label><div class="quick-role-switch"><label><input type="radio" name="role" value="trade" ${context.role === 'trade' ? 'checked' : ''} data-control="quick-update-role" /><span>${tradeIcon(context.trade)}Trade Partner</span></label><label><input type="radio" name="role" value="turner" ${context.role === 'turner' ? 'checked' : ''} data-control="quick-update-role" /><span>${icon('check')}Turner</span></label></div></div>
      <div class="field"><label for="quick-building">Building</label><select class="select" id="quick-building" name="buildingId" data-control="quick-update-building">${data.buildings.map((building) => `<option value="${escapeHtml(building.id)}" ${building.id === context.building.id ? 'selected' : ''}>${escapeHtml(building.name)}</option>`).join('')}</select><div class="field-help">Project code: ${escapeHtml(projectCode)}</div></div>
      <div class="field"><label for="quick-room-code">Room code / QR</label><div class="quick-code-row"><input class="input" id="quick-room-code" name="roomCode" value="${escapeHtml(context.room?.quickCode || '')}" placeholder="TS-PROJECT-205" /><button class="button button--secondary button--small" type="button" data-action="apply-quick-room-code">Use</button></div></div>
      <div class="field field--full"><label for="quick-room">Room / Work Area</label><select class="select" id="quick-room" name="roomId" data-control="quick-update-room" ${context.rooms.length ? '' : 'disabled'}>${context.rooms.map((room) => `<option value="${escapeHtml(room.id)}" ${room.id === context.room?.id ? 'selected' : ''}>${locationCategoryLabel(room.category)} · ${escapeHtml(room.number)} ${escapeHtml(room.name)} · ${escapeHtml(room.location)}</option>`).join('') || '<option>No rooms available</option>'}</select></div>
      <div class="field"><label for="quick-trade">Trade</label><select class="select" id="quick-trade" name="trade" data-control="quick-update-trade">${TRADE_META.map((trade) => `<option value="${escapeHtml(trade.name)}" ${trade.name === context.trade ? 'selected' : ''}>${escapeHtml(trade.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="quick-task">Task / Scope</label><select class="select" id="quick-task" name="taskId" data-control="quick-update-task">${taskOptions}</select></div>
      <div class="field field--full"><label>Status</label><div class="quick-status-grid"><label><input type="radio" name="status" value="complete" ${context.status === 'complete' ? 'checked' : ''} /><span class="quick-status quick-status--complete">${icon('check')}Complete</span></label><label><input type="radio" name="status" value="in-progress" ${context.status === 'in-progress' ? 'checked' : ''} /><span class="quick-status quick-status--progress">${icon('clock')}In Progress</span></label><label><input type="radio" name="status" value="not-started" ${context.status === 'not-started' ? 'checked' : ''} /><span class="quick-status quick-status--pending">${icon('minus')}Not Started</span></label></div></div>
      <div class="field field--full"><div class="quick-note-label"><label for="quick-note">Comment / field note</label><button class="button button--ghost button--small" type="button" data-action="start-quick-dictation">${icon('message')}Dictate Note</button></div><textarea class="textarea" id="quick-note" name="note" placeholder="Add a short update, issue, or verification note"></textarea></div>
      ${renderImageUploadField({ id: 'quick-update-images', name: 'quickUpdateImages', label: 'Photo proof', help: 'Optional. Upload or paste screenshots into the note field.' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button>${typeof BarcodeDetector !== 'undefined' ? `<button class="button button--secondary" type="button" data-action="open-quick-scanner">${icon('search')}Scan QR</button>` : ''}<button class="button button--primary" type="submit" form="quick-update-form">Submit Update</button>`);
}

function renderQuickScannerModal() {
  return modalShell('Scan Room QR Code', `<div class="quick-scanner"><video id="quick-qr-video" playsinline muted></video><div class="quick-scanner__frame"></div><p>Point the camera at a TradeSYNC room QR code. A manual room code can always be used from Quick Update.</p><div id="quick-qr-status" class="small muted">Starting camera...</div></div>`, `<button class="button button--secondary" type="button" data-action="close-quick-scanner">Cancel</button>`);
}

renderModal = function renderModalWithReadinessWorkflows() {
  if (!ui.modal) return '';
  if (ui.modal.type === 'readiness-details') return renderReadinessDetailsModal();
  if (ui.modal.type === 'request-handoff') return renderRequestHandoffModal();
  if (ui.modal.type === 'handoff-response') return renderHandoffResponseModal();
  if (ui.modal.type === 'resolve-constraint') return renderResolveConstraintModal();
  if (ui.modal.type === 'quick-update') return renderQuickUpdateModal();
  if (ui.modal.type === 'quick-scanner') return renderQuickScannerModal();
  return readinessUiRenderModalBase();
};

commentDraftFormSpec = function commentDraftFormSpecWithWorkflowForms(form) {
  const base = readinessUiCommentDraftFormSpecBase(form);
  if (base) return base;
  if (!form) return null;
  if (form.id === 'quick-update-form') {
    const context = quickUpdateContext();
    return { key: `quick-update:${context.role}:${context.building?.id || ''}:${context.room?.id || ''}:${context.trade}:${context.taskId || ''}`, context: 'Quick update note', textName: 'note', imageName: 'quickUpdateImages' };
  }
  if (form.id === 'handoff-request-form') {
    return { key: `handoff-request:${form.elements.roomId?.value || ''}:${form.elements.fromTrade?.value || ''}`, context: 'Handoff request note', textName: 'note', imageName: 'handoffImages' };
  }
  if (form.id === 'handoff-response-form') {
    return { key: `handoff-response:${form.elements.handoffId?.value || ''}`, context: 'Handoff response note', textName: 'note', imageName: 'handoffResponseImages' };
  }
  if (form.id === 'constraint-resolution-form') {
    return { key: `constraint-resolution:${form.elements.constraintId?.value || ''}`, context: 'Constraint resolution note', textName: 'note', imageName: 'constraintResolutionImages' };
  }
  return null;
};

enhanceCommentDraftForm = function enhanceWorkflowDraftForm(form) {
  readinessUiEnhanceCommentDraftFormBase(form);
  if (!form || form.dataset.commentDraftEnhanced !== 'true') return;
  const desired = form.dataset.commentSubmitLabel;
  if (!desired) return;
  const button = form.closest('.modal')?.querySelector(`button[type="submit"][form="${form.id}"]`);
  if (button) button.textContent = desired;
};
