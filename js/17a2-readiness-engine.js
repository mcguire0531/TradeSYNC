'use strict';

function findRoomByQuickCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;
  return data.rooms.find((room) => String(room.quickCode || roomQuickCode(room)).toUpperCase() === normalized)
    || data.rooms.find((room) => String(room.number).toUpperCase() === normalized);
}

function handoffsForRoom(roomId = ui.selectedRoomId) {
  return (data.handoffs || []).filter((item) => item.roomId === roomId);
}

function activeHandoffsForRoom(roomId = ui.selectedRoomId) {
  return handoffsForRoom(roomId).filter((item) => item.status === 'requested' || item.status === 'rejected');
}

function inspectionGatesForBuilding(buildingId = scopedBuilding()?.id) {
  return data.inspections.filter((item) => item.buildingId === buildingId && normalizeInspectionReadinessGate(item).requiredGate);
}

function constraintImpactForRoom(item, room) {
  if (!item || !room || item.buildingId !== room.buildingId || item.status !== 'active') return false;
  normalizeConstraintImpact(item);
  const impact = item.impact;
  if (impact.scope === 'room' && impact.roomIds.length) return impact.roomIds.includes(room.id);
  if ((impact.scope === 'location' || impact.scope === 'section') && impact.areaIds.length) return impact.areaIds.includes(room.areaId);
  if (impact.category !== 'all' && impact.category !== room.category) return false;
  if (impact.roomIds.length && !impact.roomIds.includes(room.id)) return false;
  if (impact.areaIds.length && !impact.areaIds.includes(room.areaId)) return false;
  return true;
}

function constraintsAffectingRoom(room) {
  return data.constraints.filter((item) => constraintImpactForRoom(item, room));
}

function readinessWorkspaceTasks(roomId) {
  const tasks = data.tasksByRoom?.[roomId];
  return Array.isArray(tasks) ? tasks : null;
}

function isTradeCompleteForRoom(roomId, tradeName, view = 'turner') {
  const tasks = readinessWorkspaceTasks(roomId);
  if (!tasks) {
    const room = data.rooms.find((item) => item.id === roomId);
    return Number(room?.progress || 0) >= 100;
  }
  const tradeTasks = tasks.filter((task) => task.trade === tradeName);
  return tradeTasks.length > 0 && tradeTasks.every((task) => taskStatusForView(task, view) === 'complete');
}

function gateIsRelevantToRoom(gate, room) {
  normalizeInspectionReadinessGate(gate);
  if (!gate.requiredGate || gate.buildingId !== room.buildingId) return false;
  if (gate.gateStage === 'structure' || gate.gateStage === 'turnover') return true;
  if (!gate.affectedTrades.length) return true;
  const workspace = readinessWorkspaceTasks(room.id);
  if (!workspace) return Number(room.progress || 0) > 0;
  const knownTrades = gate.affectedTrades.filter((trade) => workspace.some((task) => task.trade === trade));
  if (!knownTrades.length) return true;
  return knownTrades.some((trade) => isTradeCompleteForRoom(room.id, trade, 'turner'));
}

function readinessStateMeta(state) {
  return READINESS_STATE_META[state] || READINESS_STATE_META['not-started'];
}

function roomReadiness(room) {
  if (!room) {
    return {
      state: 'not-started',
      ...readinessStateMeta('not-started'),
      score: 0,
      reasons: ['No room selected.'],
      nextAction: 'Select a room or work area.'
    };
  }

  const workspace = readinessWorkspaceTasks(room.id);
  let turnerTrades;
  if (workspace) {
    turnerTrades = TRADE_META.map((trade) => collaborationTradeSummary(trade.name, room.id, 'turner'));
  } else {
    const total = TRADE_META.length;
    const legacyPercent = clamp(Number(room.progress || 0), 0, 100);
    const completeCount = legacyPercent >= 100 ? total : Math.floor((legacyPercent / 100) * total);
    const hasProgressTrade = legacyPercent > 0 && legacyPercent < 100 && completeCount < total;
    turnerTrades = TRADE_META.map((trade, index) => ({
      ...trade,
      total: 0,
      complete: index < completeCount ? 1 : 0,
      percent: index < completeCount ? 100 : index === completeCount && hasProgressTrade ? Math.max(1, legacyPercent % 10) * 10 : 0,
      status: index < completeCount ? 'complete' : index === completeCount && hasProgressTrade ? 'in-progress' : 'not-started'
    }));
  }
  const complete = turnerTrades.filter((trade) => trade.status === 'complete').length;
  const inProgress = turnerTrades.filter((trade) => trade.status === 'in-progress').length;
  const notStarted = turnerTrades.filter((trade) => trade.status === 'not-started').length;
  const percent = workspace
    ? (turnerTrades.length ? Math.round((complete / turnerTrades.length) * 100) : 0)
    : clamp(Number(room.progress || 0), 0, 100);
  const allComplete = turnerTrades.length > 0 && complete === turnerTrades.length;
  const started = complete > 0 || inProgress > 0;

  const clashes = workspace ? roomTaskClashes(room.id) : [];
  const constraints = constraintsAffectingRoom(room);
  const blockingConstraints = constraints.filter((item) => normalizeConstraintImpact(item).impact.blocksReadiness || item.priority === 'critical');
  const riskConstraints = constraints.filter((item) => !blockingConstraints.includes(item));
  const gates = inspectionGatesForBuilding(room.buildingId).filter((item) => gateIsRelevantToRoom(item, room));
  const failedGates = gates.filter((item) => item.status === 'failed' && item.blocksReadiness);
  const pendingGates = gates.filter((item) => item.status !== 'passed');
  const handoffs = handoffsForRoom(room.id);
  const rejectedHandoffs = handoffs.filter((item) => item.status === 'rejected');
  const requestedHandoffs = handoffs.filter((item) => item.status === 'requested');
  const overdueHandoffs = requestedHandoffs.filter((item) => daysFromToday(item.dueDate) < 0);

  let state = 'not-started';
  const reasons = [];
  let nextAction = 'Start the first trade task.';

  if (clashes.length) {
    state = 'blocked';
    reasons.push(`${clashes.length} Trade/Turner verification clash${clashes.length === 1 ? '' : 'es'} must be corrected.`);
    nextAction = 'Review and reconcile the verification clash.';
  } else if (failedGates.length) {
    state = 'blocked';
    reasons.push(`${failedGates.length} required inspection gate${failedGates.length === 1 ? '' : 's'} failed.`);
    nextAction = 'Correct the failed gate and request reinspection.';
  } else if (blockingConstraints.length) {
    state = 'blocked';
    reasons.push(`${blockingConstraints.length} active constraint${blockingConstraints.length === 1 ? '' : 's'} block readiness.`);
    nextAction = 'Resolve the blocking constraint.';
  } else if (rejectedHandoffs.length) {
    state = 'blocked';
    reasons.push(`${rejectedHandoffs.length} rejected handoff${rejectedHandoffs.length === 1 ? '' : 's'} require correction.`);
    nextAction = 'Correct the handoff issue and resubmit.';
  } else if (requestedHandoffs.length) {
    state = 'ready-for-handoff';
    reasons.push(`${requestedHandoffs.length} handoff${requestedHandoffs.length === 1 ? '' : 's'} await acceptance.`);
    nextAction = 'Accept or respond to the pending handoff.';
  } else if (allComplete && pendingGates.length) {
    state = 'ready-for-inspection';
    reasons.push(`${pendingGates.length} required inspection gate${pendingGates.length === 1 ? '' : 's'} remain.`);
    nextAction = 'Complete the required inspection gates.';
  } else if (allComplete) {
    state = 'turnover-ready';
    reasons.push('All trades are Turner-confirmed, required gates passed, and no blockers remain.');
    nextAction = 'Confirm turnover readiness.';
  } else if (pendingGates.length && complete > 0) {
    state = 'ready-for-inspection';
    reasons.push(`${pendingGates.length} required gate${pendingGates.length === 1 ? '' : 's'} can be completed as trade work finishes.`);
    nextAction = 'Complete the next required inspection gate.';
  } else if (riskConstraints.length || overdueHandoffs.length) {
    state = 'at-risk';
    if (riskConstraints.length) reasons.push(`${riskConstraints.length} active constraint${riskConstraints.length === 1 ? '' : 's'} create schedule or coordination risk.`);
    if (overdueHandoffs.length) reasons.push(`${overdueHandoffs.length} handoff${overdueHandoffs.length === 1 ? '' : 's'} are overdue.`);
    nextAction = 'Address the highest-impact risk.';
  } else if (started) {
    state = 'in-progress';
    reasons.push(`${complete} of ${turnerTrades.length} trades are Turner-confirmed complete.`);
    nextAction = 'Complete the next trade scope or request a handoff.';
  } else {
    reasons.push('No Turner-confirmed trade work has started.');
  }

  let score = percent;
  score -= clashes.length * 15;
  score -= failedGates.length * 25;
  score -= blockingConstraints.length * 20;
  score -= rejectedHandoffs.length * 20;
  score -= riskConstraints.length * 5;
  score -= overdueHandoffs.length * 5;
  if (state === 'turnover-ready') score = 100;
  score = clamp(score, 0, 100);

  return {
    state,
    ...readinessStateMeta(state),
    score,
    percent,
    complete,
    inProgress,
    notStarted,
    totalTrades: turnerTrades.length,
    clashes,
    constraints,
    blockingConstraints,
    riskConstraints,
    gates,
    failedGates,
    pendingGates,
    handoffs,
    requestedHandoffs,
    rejectedHandoffs,
    overdueHandoffs,
    reasons,
    nextAction
  };
}

function buildingReadinessSummary(buildingId) {
  const rooms = projectRoomsForBuilding(buildingId);
  const records = rooms.map((room) => ({ room, readiness: roomReadiness(room) }));
  const count = (state) => records.filter((record) => record.readiness.state === state).length;
  return {
    rooms,
    records,
    total: rooms.length,
    ready: count('turnover-ready'),
    handoff: count('ready-for-handoff'),
    inspection: count('ready-for-inspection'),
    inProgress: count('in-progress'),
    atRisk: count('at-risk'),
    blocked: count('blocked'),
    notStarted: count('not-started'),
    averageScore: records.length ? Math.round(records.reduce((sum, record) => sum + record.readiness.score, 0) / records.length) : 0
  };
}

function portfolioReadinessSummary() {
  const buildings = data.buildings.map((building) => ({ building, summary: buildingReadinessSummary(building.id) }));
  return {
    buildings,
    totalRooms: buildings.reduce((sum, item) => sum + item.summary.total, 0),
    ready: buildings.reduce((sum, item) => sum + item.summary.ready, 0),
    blocked: buildings.reduce((sum, item) => sum + item.summary.blocked, 0),
    atRisk: buildings.reduce((sum, item) => sum + item.summary.atRisk, 0),
    pendingHandoffs: data.handoffs.filter((item) => item.status === 'requested').length,
    verificationClashes: Object.values(data.tasksByRoom || {}).flat().filter(taskHasStatusClash).length,
    failedGates: data.inspections.filter((item) => normalizeInspectionReadinessGate(item).requiredGate && item.status === 'failed').length
  };
}

function nextSuggestedTrade(roomId, fromTrade) {
  const start = Math.max(0, HANDOFF_TRADE_SEQUENCE.indexOf(fromTrade));
  const ordered = [...HANDOFF_TRADE_SEQUENCE.slice(start + 1), ...HANDOFF_TRADE_SEQUENCE.slice(0, start + 1)];
  return ordered.find((trade) => trade !== fromTrade && collaborationTradeSummary(trade, roomId, 'turner').status !== 'complete')
    || ordered.find((trade) => trade !== fromTrade)
    || TRADE_META.find((trade) => trade.name !== fromTrade)?.name
    || 'Turner';
}

function verificationBacklog(buildingId = scopedBuilding()?.id) {
  const roomIds = new Set(projectRoomsForBuilding(buildingId).map((room) => room.id));
  return Object.values(data.tasksByRoom || {}).flat()
    .filter((task) => roomIds.has(task.roomId) && taskHasStatusClash(task))
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
}

removeBuilding = function removeBuildingWithWorkflowRecords(buildingId) {
  data.handoffs = (data.handoffs || []).filter((item) => item.buildingId !== buildingId);
  data.quickUpdates = (data.quickUpdates || []).filter((item) => item.buildingId !== buildingId);
  readinessRemoveBuildingBase(buildingId);
};
