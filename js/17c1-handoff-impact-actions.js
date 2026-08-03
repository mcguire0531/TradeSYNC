'use strict';

/* Actions for readiness, handoffs, impact confirmation, gates, and Quick Update. */

let quickScannerStream = null;
let quickScannerTimer = null;
let quickDictationRecognition = null;

function workflowDraftKeyFromFormData(formData) {
  return String(formData.get('commentDraftKey') || '');
}

function clearWorkflowDraft(formData) {
  const key = workflowDraftKeyFromFormData(formData);
  if (key) deleteCommentDraft(key);
}

function workflowFormAttachments(formData, fieldName) {
  return attachmentsFromForm(formData, fieldName);
}

function workflowRoom(roomId) {
  return data.rooms.find((room) => room.id === roomId) || null;
}

function workflowBuilding(buildingId) {
  return data.buildings.find((building) => building.id === buildingId) || null;
}

function workflowComment(body, attachments = [], author = CURRENT_USER, prefix = 'wf') {
  return {
    id: nextId(prefix),
    author,
    body: String(body || ''),
    createdAt: readinessNowIso(),
    attachments: normalizeAttachments(attachments)
  };
}

async function requestTradeHandoff(formData) {
  try {
    const room = workflowRoom(String(formData.get('roomId') || ''));
    const building = workflowBuilding(String(formData.get('buildingId') || ''));
    const fromTrade = String(formData.get('fromTrade') || '');
    const toTrade = String(formData.get('toTrade') || '');
    const note = String(formData.get('note') || '').trim();
    const dueDate = String(formData.get('dueDate') || dateOffset(2));
    const attachments = await workflowFormAttachments(formData, 'handoffImages');
    if (!room || !building || room.buildingId !== building.id) {
      toast('Choose a valid building and room before requesting the handoff.');
      return;
    }
    if (!fromTrade || !toTrade || fromTrade === toTrade) {
      toast('Choose two different trades for the handoff.');
      return;
    }
    const currentView = activeTaskInterface();
    const fromSummary = collaborationTradeSummary(fromTrade, room.id, currentView);
    if (fromSummary.status !== 'complete') {
      toast(`${fromTrade} must be complete in ${taskInterfaceLabel(currentView)} before requesting a handoff.`);
      return;
    }
    const duplicate = data.handoffs.find((item) => item.roomId === room.id && item.fromTrade === fromTrade && item.toTrade === toTrade && (item.status === 'requested' || item.status === 'rejected'));
    if (duplicate) {
      ui.modal = { type: 'handoff-response', handoffId: duplicate.id };
      render();
      toast('An open handoff already exists for these trades.');
      return;
    }
    const item = normalizeHandoffRecord({
      id: nextId('handoff'),
      buildingId: building.id,
      roomId: room.id,
      fromTrade,
      toTrade,
      status: 'requested',
      dueDate,
      note,
      requestedBy: CURRENT_USER,
      respondedBy: '',
      createdAt: readinessNowIso(),
      updatedAt: readinessNowIso(),
      attachments,
      history: [{ id: nextId('hh'), action: 'Handoff requested', note, user: CURRENT_USER, createdAt: readinessNowIso() }]
    });
    data.handoffs.unshift(item);
    addActivity('progress', `${fromTrade} requested a handoff to ${toTrade} in ${room.category === 'exterior' ? 'Area' : 'Room'} ${room.number}`);
    if (!persistWithRollback(() => {
      const index = data.handoffs.indexOf(item);
      if (index >= 0) data.handoffs.splice(index, 1);
    })) return;
    clearWorkflowDraft(formData);
    ui.modal = null;
    render();
    toast(`Handoff sent to ${toTrade}.`);
  } catch (error) {
    console.warn('TradeSYNC could not request the handoff.', error);
    toast(error.message || 'The handoff could not be requested.');
  }
}

async function respondToTradeHandoff(formData) {
  try {
    const item = data.handoffs.find((handoff) => handoff.id === String(formData.get('handoffId') || ''));
    const decision = String(formData.get('decision') || 'accepted') === 'rejected' ? 'rejected' : 'accepted';
    const note = String(formData.get('note') || '').trim();
    const attachments = await workflowFormAttachments(formData, 'handoffResponseImages');
    if (!item) {
      toast('This handoff record could not be found.');
      return;
    }
    if (decision === 'rejected' && !note) {
      toast('Add a correction note before rejecting the handoff.');
      return;
    }
    const previous = { status: item.status, respondedBy: item.respondedBy, updatedAt: item.updatedAt, attachments: item.attachments.slice(), historyLength: item.history.length };
    item.status = decision;
    item.respondedBy = CURRENT_USER;
    item.updatedAt = readinessNowIso();
    item.attachments.push(...attachments);
    item.history.push({
      id: nextId('hh'),
      action: decision === 'accepted' ? 'Handoff accepted' : 'Correction requested',
      note,
      user: CURRENT_USER,
      createdAt: item.updatedAt
    });
    const room = workflowRoom(item.roomId);
    addActivity(decision === 'accepted' ? 'complete' : 'failed', `${item.toTrade} ${decision === 'accepted' ? 'accepted' : 'rejected'} ${item.fromTrade} handoff${room ? ` in ${room.category === 'exterior' ? 'Area' : 'Room'} ${room.number}` : ''}`);
    if (!persistWithRollback(() => {
      item.status = previous.status;
      item.respondedBy = previous.respondedBy;
      item.updatedAt = previous.updatedAt;
      item.attachments = previous.attachments;
      item.history = item.history.slice(0, previous.historyLength);
    })) return;
    clearWorkflowDraft(formData);
    ui.modal = { type: 'handoff-response', handoffId: item.id };
    render();
    toast(decision === 'accepted' ? 'Handoff accepted. The next trade can proceed.' : 'Handoff returned for correction. Readiness is blocked until it is resubmitted.');
  } catch (error) {
    console.warn('TradeSYNC could not respond to the handoff.', error);
    toast(error.message || 'The handoff response could not be saved.');
  }
}

addConstraintFromForm = async function addConstraintWithImpact(formData) {
  try {
    const buildingId = String(formData.get('buildingId') || scopedBuilding()?.id || '');
    const building = workflowBuilding(buildingId);
    if (!building) {
      toast('Choose a valid building before adding the constraint.');
      return;
    }
    const attachments = await workflowFormAttachments(formData, 'constraintImages');
    const areaId = String(formData.get('impactAreaId') || '');
    const roomId = String(formData.get('impactRoomId') || '');
    const affectedTrades = formData.getAll('affectedTrades').map(String).filter(Boolean);
    const item = normalizeConstraintImpact(normalizeConstraint({
      id: nextId('c'),
      buildingId,
      title: String(formData.get('title') || '').trim(),
      type: String(formData.get('type') || 'Coordination') === 'Clash' ? 'Coordination' : String(formData.get('type') || 'Coordination'),
      priority: String(formData.get('priority') || 'moderate'),
      status: 'active',
      description: String(formData.get('description') || '').trim(),
      startDate: dateOffset(0),
      endDate: String(formData.get('resolveBy') || dateOffset(7)),
      owner: String(formData.get('owner') || CURRENT_USER).trim(),
      attachments,
      comments: [],
      impact: {
        type: String(formData.get('impactType') || 'Schedule Risk'),
        scope: String(formData.get('impactScope') || 'building'),
        category: String(formData.get('impactCategory') || 'all'),
        areaIds: areaId ? [areaId] : [],
        roomIds: roomId ? [roomId] : [],
        trades: affectedTrades,
        delayDays: Number(formData.get('delayDays')) || 0,
        blocksReadiness: readinessBoolean(formData.get('blocksReadiness'), false),
        blockedStage: String(formData.get('blockedStage') || 'all'),
        summary: ''
      },
      resolution: { note: '', confirmed: false, resolvedBy: '', resolvedAt: '' }
    }));
    if (!item.title || !item.description) {
      toast('Add a title and description for the constraint.');
      return;
    }
    data.constraints.unshift(item);
    addActivity('progress', `${item.title} added to ${building.name}; impact: ${item.impact.type}`);
    if (!persistWithRollback(() => {
      const index = data.constraints.indexOf(item);
      if (index >= 0) data.constraints.splice(index, 1);
    })) return;
    ui.modal = null;
    render();
    toast(item.impact.blocksReadiness ? 'Constraint added and readiness impact is active.' : 'Constraint added with impact details.');
  } catch (error) {
    console.warn('TradeSYNC could not add the constraint impact.', error);
    toast(error.message || 'The constraint could not be added.');
  }
};

async function resolveConstraintWithConfirmation(formData) {
  try {
    const item = data.constraints.find((constraint) => constraint.id === String(formData.get('constraintId') || ''));
    const confirmed = readinessBoolean(formData.get('confirmed'), false);
    const note = String(formData.get('note') || '').trim();
    const attachments = await workflowFormAttachments(formData, 'constraintResolutionImages');
    if (!item || !confirmed || !note) {
      toast('Confirm the condition is cleared and add a resolution note.');
      return;
    }
    normalizeConstraintImpact(item);
    const previous = { status: item.status, resolution: { ...item.resolution }, commentsLength: constraintComments(item).length };
    item.status = 'resolved';
    item.resolution = { note, confirmed: true, resolvedBy: CURRENT_USER, resolvedAt: readinessNowIso() };
    constraintComments(item).push(workflowComment(`Resolution confirmed: ${note}`, attachments, CURRENT_USER, 'cc'));
    addActivity('complete', `${item.title} resolved and readiness impact cleared`);
    if (!persistWithRollback(() => {
      item.status = previous.status;
      item.resolution = previous.resolution;
      item.comments = item.comments.slice(0, previous.commentsLength);
    })) return;
    clearWorkflowDraft(formData);
    ui.modal = { type: 'constraint-detail', constraintId: item.id };
    render();
    toast('Constraint moved to Resolved. Readiness was recalculated.');
  } catch (error) {
    console.warn('TradeSYNC could not resolve the constraint.', error);
    toast(error.message || 'The constraint could not be resolved.');
  }
}

function reopenAdvancedConstraint(constraintId) {
  const item = data.constraints.find((constraint) => constraint.id === constraintId);
  if (!item) return;
  normalizeConstraintImpact(item);
  item.status = 'active';
  item.resolution.confirmed = false;
  constraintComments(item).push(workflowComment('Constraint reopened. The readiness impact is active again.', [], CURRENT_USER, 'cc'));
  addActivity('progress', `${item.title} reopened; readiness impact restored`);
  saveData();
  ui.modal = null;
  render();
  toast('Constraint reopened and returned to its active priority section.');
}

addBuildingScopedInspection = function addBuildingInspectionGate(formData) {
  const buildingId = String(formData.get('buildingId') || '');
  const building = workflowBuilding(buildingId);
  if (!building) {
    toast('Choose a valid building before adding the inspection.');
    return;
  }
  const status = String(formData.get('status') || 'not-inspected');
  const requiredGate = readinessBoolean(formData.get('requiredGate'), false);
  const item = normalizeInspectionReadinessGate({
    id: nextId('i'),
    buildingId,
    trade: String(formData.get('trade') || 'Electrical'),
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    status,
    assignee: String(formData.get('assignee') || 'M. Turner').trim(),
    scheduled: String(formData.get('scheduled') || dateOffset(3)),
    completed: status === 'not-inspected' ? null : dateOffset(0),
    comment: status === 'failed' ? 'Correction required. Add inspection details.' : '',
    commentHistory: [],
    requiredGate,
    gateStage: String(formData.get('gateStage') || 'turnover'),
    blocksReadiness: requiredGate && readinessBoolean(formData.get('blocksReadiness'), true),
    affectedTrades: [String(formData.get('trade') || 'Electrical')]
  });
  if (!item.title || !item.description) {
    toast('Add an inspection name and acceptance criteria.');
    return;
  }
  if (item.comment) item.commentHistory.push(workflowComment(item.comment, [], item.assignee, 'ic'));
  data.inspections.push(item);
  ui.selectedBuildingId = buildingId;
  ui.inspectionTrade = item.trade;
  addActivity(status, `${item.trade} - ${item.title} added to ${building.name}${requiredGate ? ' as a readiness gate' : ''}`);
  saveData();
  ui.modal = null;
  go(`#inspections/${encodeURIComponent(item.trade)}`);
  toast(requiredGate ? 'Inspection gate added. It now affects room readiness.' : 'Building-wide inspection added.');
};
