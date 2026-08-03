'use strict';

function quickUpdateSelectedTasks(room, trade, taskId) {
  const tasks = roomTasks(room.id).filter((task) => task.trade === trade);
  if (taskId === '__trade__') return tasks;
  return tasks.filter((task) => task.id === taskId);
}

async function submitQuickUpdate(formData) {
  try {
    const building = workflowBuilding(String(formData.get('buildingId') || ''));
    const room = workflowRoom(String(formData.get('roomId') || ''));
    const role = String(formData.get('role') || 'turner') === 'trade' ? 'trade' : 'turner';
    const trade = String(formData.get('trade') || 'Electrical');
    const taskId = String(formData.get('taskId') || '__trade__');
    const status = validCollaborationStatus(String(formData.get('status') || 'complete'));
    const note = String(formData.get('note') || '').trim();
    const attachments = await workflowFormAttachments(formData, 'quickUpdateImages');
    if (!building || !room || room.buildingId !== building.id) {
      toast('Choose a valid building and room for the update.');
      return;
    }
    const tasks = quickUpdateSelectedTasks(room, trade, taskId);
    if (!tasks.length) {
      toast(`No ${trade} tasks are available in this room. Add a task first.`);
      return;
    }
    const snapshots = tasks.map((task) => ({
      task,
      tradeStatus: task.tradeStatus,
      turnerStatus: task.turnerStatus,
      tradeCompletedDate: task.tradeCompletedDate,
      turnerCompletedDate: task.turnerCompletedDate,
      historyLength: verificationHistoryForTask(task).length,
      commentsLength: taskComments(task).length
    }));
    tasks.forEach((task) => setTaskStatusForView(task, status, role, 'quick-update'));
    if (note || attachments.length) {
      tasks.forEach((task, index) => {
        const copy = taskId === '__trade__' && index > 0
          ? `Trade-wide quick update: ${taskStatusLabel(status)}.${note ? ` ${note}` : ''}`
          : (note || `Quick update: ${taskStatusLabel(status)}.`);
        taskComments(task).push(workflowComment(copy, index === 0 ? attachments : [], CURRENT_USER, 'tc'));
      });
    }
    const quickRecord = {
      id: nextId('quick'),
      buildingId: building.id,
      roomId: room.id,
      role,
      trade,
      taskIds: tasks.map((task) => task.id),
      status,
      note,
      attachments,
      submittedBy: CURRENT_USER,
      createdAt: readinessNowIso()
    };
    data.quickUpdates.unshift(quickRecord);
    data.quickUpdates = data.quickUpdates.slice(0, 100);
    addActivity(status === 'complete' ? 'complete' : 'progress', `${taskInterfaceLabel(role)} quick update: ${trade} ${taskStatusLabel(status)} in ${room.category === 'exterior' ? 'Area' : 'Room'} ${room.number}`);
    syncRoomProgress(room.id, false);
    if (!persistWithRollback(() => {
      data.quickUpdates = data.quickUpdates.filter((item) => item.id !== quickRecord.id);
      snapshots.forEach((snapshot) => {
        snapshot.task.tradeStatus = snapshot.tradeStatus;
        snapshot.task.turnerStatus = snapshot.turnerStatus;
        snapshot.task.tradeCompletedDate = snapshot.tradeCompletedDate;
        snapshot.task.turnerCompletedDate = snapshot.turnerCompletedDate;
        snapshot.task.verificationHistory = snapshot.task.verificationHistory.slice(0, snapshot.historyLength);
        snapshot.task.comments = snapshot.task.comments.slice(0, snapshot.commentsLength);
        ensureTaskInterfaceState(snapshot.task);
      });
      syncRoomProgress(room.id, false);
    })) return;
    clearWorkflowDraft(formData);
    ui.selectedBuildingId = building.id;
    ui.selectedRoomId = room.id;
    ui.modal = null;
    render();
    const clashes = roomTaskClashes(room.id).length;
    toast(`Update submitted in ${taskInterfaceLabel(role)}.${clashes ? ` ${clashes} verification clash${clashes === 1 ? '' : 'es'} need Turner review.` : ' Both records currently agree.'}`);
  } catch (error) {
    console.warn('TradeSYNC could not submit the quick update.', error);
    toast(error.message || 'The quick update could not be submitted.');
  }
}

function openQuickUpdate(payload = {}) {
  const roomId = payload.roomId || payload.room || ui.selectedRoomId;
  const room = workflowRoom(roomId);
  ui.quickUpdateContext = {
    role: payload.role === 'trade' ? 'trade' : payload.role === 'turner' ? 'turner' : (ui.quickUpdateContext.role || 'turner'),
    buildingId: payload.buildingId || room?.buildingId || ui.selectedBuildingId,
    roomId: room?.id || '',
    trade: payload.trade || ui.quickUpdateContext.trade || TRADE_META[0]?.name,
    taskId: payload.taskId || '',
    status: payload.status || 'complete'
  };
  openModal('quick-update');
}

function nextTurnerAction() {
  let building = scopedBuilding();
  let backlog = building ? verificationBacklog(building.id) : [];
  if (!backlog.length) {
    for (const candidate of data.buildings) {
      backlog = verificationBacklog(candidate.id);
      if (backlog.length) {
        building = candidate;
        break;
      }
    }
  }
  let task = backlog[0];
  if (!task && building) {
    const roomIds = new Set(projectRoomsForBuilding(building.id).map((room) => room.id));
    task = Object.values(data.tasksByRoom || {}).flat().find((candidate) => roomIds.has(candidate.roomId) && taskStatusForView(candidate, 'turner') !== 'complete');
  }
  if (!task) {
    openQuickUpdate({ role: 'turner', buildingId: building?.id || ui.selectedBuildingId });
    toast('No pending verification clash was found. Quick Update is ready for a Turner check.');
    return;
  }
  const room = workflowRoom(task.roomId);
  ui.selectedBuildingId = room?.buildingId || building?.id || ui.selectedBuildingId;
  ui.selectedRoomId = room?.id || ui.selectedRoomId;
  openQuickUpdate({ role: 'turner', buildingId: ui.selectedBuildingId, roomId: room?.id, trade: task.trade, taskId: task.id, status: task.tradeStatus });
}

function transferQuickDraft(form, nextContext) {
  const oldSpec = commentDraftFormSpec(form);
  const oldDraft = oldSpec ? getCommentDraft(oldSpec.key) : null;
  const body = form?.elements.note?.value || oldDraft?.body || '';
  const attachments = normalizeAttachments(oldDraft?.attachments);
  ui.quickUpdateContext = { ...ui.quickUpdateContext, ...nextContext };
  const context = quickUpdateContext();
  const newKey = `quick-update:${context.role}:${context.building?.id || ''}:${context.room?.id || ''}:${context.trade}:${context.taskId || ''}`;
  if (body.trim() || attachments.length) setCommentDraft(newKey, { body, attachments, context: 'Quick update note' });
  if (oldSpec && oldSpec.key !== newKey) deleteCommentDraft(oldSpec.key);
  ui.modal = { type: 'quick-update' };
  render();
}

function applyQuickRoomCode(form) {
  const code = String(form?.elements.roomCode?.value || '').trim();
  const room = findRoomByQuickCode(code);
  if (!room) {
    toast('Room code not found. Check the code and try again.');
    return;
  }
  transferQuickDraft(form, { buildingId: room.buildingId, roomId: room.id, taskId: '' });
  toast(`${room.category === 'exterior' ? 'Area' : 'Room'} ${room.number} loaded.`);
}

function stopQuickScanner() {
  if (quickScannerTimer) window.clearTimeout(quickScannerTimer);
  quickScannerTimer = null;
  if (quickScannerStream) quickScannerStream.getTracks().forEach((track) => track.stop());
  quickScannerStream = null;
}

function parseQuickScanValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const hashMatch = raw.match(/#quick\/([^/]+)\/([^/]+)/i);
  if (hashMatch) {
    const buildingId = decodeURIComponent(hashMatch[1]);
    const roomId = decodeURIComponent(hashMatch[2]);
    const room = workflowRoom(roomId);
    if (room && room.buildingId === buildingId) return room;
  }
  const protocolMatch = raw.match(/^tradesync:\/\/room\/([^/]+)\/([^/]+)/i);
  if (protocolMatch) {
    const buildingId = decodeURIComponent(protocolMatch[1]);
    const roomId = decodeURIComponent(protocolMatch[2]);
    const room = workflowRoom(roomId);
    if (room && room.buildingId === buildingId) return room;
  }
  return findRoomByQuickCode(raw);
}

async function startQuickScanner() {
  stopQuickScanner();
  const status = document.getElementById('quick-qr-status');
  const video = document.getElementById('quick-qr-video');
  if (!video || typeof BarcodeDetector === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    if (status) status.textContent = 'QR scanning is not supported in this browser. Use the room code instead.';
    return;
  }
  try {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    quickScannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = quickScannerStream;
    await video.play();
    if (status) status.textContent = 'Scanning...';
    const scan = async () => {
      if (!quickScannerStream || ui.modal?.type !== 'quick-scanner') return;
      try {
        const codes = await detector.detect(video);
        const room = codes.map((code) => parseQuickScanValue(code.rawValue)).find(Boolean);
        if (room) {
          stopQuickScanner();
          ui.quickUpdateContext = { ...ui.quickUpdateContext, buildingId: room.buildingId, roomId: room.id, taskId: '' };
          ui.modal = { type: 'quick-update' };
          render();
          toast(`${room.category === 'exterior' ? 'Area' : 'Room'} ${room.number} loaded from QR.`);
          return;
        }
      } catch (error) {
        console.warn('TradeSYNC QR scan frame failed.', error);
      }
      quickScannerTimer = window.setTimeout(scan, 400);
    };
    scan();
  } catch (error) {
    console.warn('TradeSYNC could not start the QR scanner.', error);
    if (status) status.textContent = 'Camera access was unavailable. Use the room code instead.';
  }
}

function startQuickDictation() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const textarea = document.getElementById('quick-note');
  if (!Recognition || !textarea) {
    toast('Voice dictation is not supported in this browser. Type the note instead.');
    return;
  }
  if (quickDictationRecognition) {
    quickDictationRecognition.stop();
    quickDictationRecognition = null;
  }
  const recognition = new Recognition();
  quickDictationRecognition = recognition;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    textarea.value = `${textarea.value}${textarea.value.trim() ? ' ' : ''}${transcript}`.trim();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    toast('Dictated note added.');
  };
  recognition.onerror = () => toast('Voice dictation could not capture the note.');
  recognition.onend = () => { if (quickDictationRecognition === recognition) quickDictationRecognition = null; };
  recognition.start();
  toast('Listening...');
}

// Capture workflow actions before older generic handlers.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'open-quick-update') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openQuickUpdate({ roomId: trigger.dataset.room, trade: trigger.dataset.trade, role: trigger.dataset.role });
  } else if (action === 'open-next-turner-verification') {
    event.preventDefault();
    event.stopImmediatePropagation();
    nextTurnerAction();
  } else if (action === 'open-readiness-details') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('readiness-details', { roomId: trigger.dataset.room || ui.selectedRoomId });
  } else if (action === 'open-request-handoff') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('request-handoff', { roomId: trigger.dataset.room || ui.selectedRoomId, trade: trigger.dataset.trade || '' });
  } else if (action === 'open-handoff-response') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('handoff-response', { handoffId: trigger.dataset.handoff });
  } else if (action === 'start-resolve-constraint') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('resolve-constraint', { constraintId: trigger.dataset.constraint });
  } else if (action === 'reopen-advanced-constraint') {
    event.preventDefault();
    event.stopImmediatePropagation();
    reopenAdvancedConstraint(trigger.dataset.constraint);
  } else if (action === 'apply-quick-room-code') {
    event.preventDefault();
    event.stopImmediatePropagation();
    applyQuickRoomCode(trigger.closest('form'));
  } else if (action === 'open-quick-scanner') {
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll('form[data-comment-draft-enhanced="true"]').forEach((form) => saveCommentDraftFromForm(form, { silent: true }));
    ui.modal = { type: 'quick-scanner' };
    render();
    window.setTimeout(startQuickScanner, 0);
  } else if (action === 'close-quick-scanner') {
    event.preventDefault();
    event.stopImmediatePropagation();
    stopQuickScanner();
    ui.modal = { type: 'quick-update' };
    render();
  } else if (action === 'start-quick-dictation') {
    event.preventDefault();
    event.stopImmediatePropagation();
    startQuickDictation();
  } else if ((action === 'close-modal' || action === 'modal-backdrop') && ui.modal?.type === 'quick-scanner') {
    stopQuickScanner();
  }
}, true);

document.addEventListener('change', (event) => {
  const control = event.target.dataset.control;
  const form = event.target.closest('#quick-update-form');
  if (!form || !control?.startsWith('quick-update-')) return;
  event.stopImmediatePropagation();
  if (control === 'quick-update-building') {
    const buildingId = event.target.value;
    const room = projectRoomsForBuilding(buildingId)[0];
    transferQuickDraft(form, { buildingId, roomId: room?.id || '', taskId: '' });
  } else if (control === 'quick-update-room') {
    transferQuickDraft(form, { roomId: event.target.value, taskId: '' });
  } else if (control === 'quick-update-trade') {
    transferQuickDraft(form, { trade: event.target.value, taskId: '' });
  } else if (control === 'quick-update-role') {
    transferQuickDraft(form, { role: event.target.value === 'trade' ? 'trade' : 'turner', taskId: '' });
  } else if (control === 'quick-update-task') {
    ui.quickUpdateContext.taskId = event.target.value;
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'handoff-request-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    requestTradeHandoff(new FormData(form));
  } else if (form.id === 'handoff-response-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    respondToTradeHandoff(new FormData(form));
  } else if (form.id === 'constraint-resolution-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    resolveConstraintWithConfirmation(new FormData(form));
  } else if (form.id === 'quick-update-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitQuickUpdate(new FormData(form));
  }
}, true);

if (['home', 'rooms', 'room', 'tasks', 'inspections', 'constraints'].includes(route().view)) render();
