'use strict';

/*
 * TradeSYNC workflow foundation.
 *
 * This layer turns the existing task, inspection, and constraint records into a
 * practical readiness system without changing the app's local-first storage
 * model. Trade and Turner decisions remain independent; readiness is derived
 * from the records rather than stored as a decorative status.
 */

const READINESS_STATE_META = {
  'turnover-ready': { label: 'Turnover Ready', shortLabel: 'Ready', tone: 'green', rank: 6 },
  'ready-for-handoff': { label: 'Ready for Next Trade', shortLabel: 'Handoff', tone: 'blue', rank: 5 },
  'ready-for-inspection': { label: 'Ready for Inspection', shortLabel: 'Inspect', tone: 'purple', rank: 4 },
  'in-progress': { label: 'In Progress', shortLabel: 'In Progress', tone: 'orange', rank: 3 },
  'at-risk': { label: 'At Risk', shortLabel: 'At Risk', tone: 'yellow', rank: 2 },
  'blocked': { label: 'Blocked', shortLabel: 'Blocked', tone: 'red', rank: 1 },
  'not-started': { label: 'Not Started', shortLabel: 'Not Started', tone: 'navy', rank: 0 }
};

const READINESS_GATE_STAGES = [
  { value: 'structure', label: 'Structure / Shell' },
  { value: 'rough-in', label: 'MEP Rough-In' },
  { value: 'close-in', label: 'Close-In' },
  { value: 'finishes', label: 'Finishes' },
  { value: 'turnover', label: 'Turnover' }
];

const HANDOFF_STATUS_LABELS = {
  requested: 'Waiting for Acceptance',
  accepted: 'Accepted',
  rejected: 'Needs Correction',
  cancelled: 'Cancelled'
};

const HANDOFF_TRADE_SEQUENCE = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Fire Protection',
  'Drywall',
  'Finishes',
  'Flooring',
  'Doors',
  'Low Voltage',
  'Millwork'
];

const readinessBuildDemoDataBase = buildDemoData;
const readinessSetTaskStatusBase = setTaskStatusForView;
const readinessRemoveBuildingBase = removeBuilding;

function readinessNowIso() {
  return new Date().toISOString();
}

function readinessBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function normalizeVerificationHistory(task) {
  if (!Array.isArray(task.verificationHistory)) task.verificationHistory = [];
  task.verificationHistory = task.verificationHistory
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id || nextId('verify')),
      view: entry.view === 'trade' ? 'trade' : 'turner',
      previousStatus: validCollaborationStatus(entry.previousStatus),
      status: validCollaborationStatus(entry.status),
      user: String(entry.user || CURRENT_USER),
      source: String(entry.source || 'status-update'),
      createdAt: String(entry.createdAt || readinessNowIso())
    }));
  return task.verificationHistory;
}

function inferInspectionGateStage(item) {
  const value = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  if (/structure|foundation|steel|shell|envelope|roof/.test(value)) return 'structure';
  if (/rough|pressure|hydrostatic|above-ceiling|support|grounding|branch piping/.test(value)) return 'rough-in';
  if (/close-in|fire-rated|gwb|drywall|ceiling/.test(value)) return 'close-in';
  if (/paint|finish|floor|hardware|millwork|touch-up/.test(value)) return 'finishes';
  return 'turnover';
}

function inferRequiredInspectionGate(item) {
  return /final|pressure test|hydrostatic|fire-rated|rough-in|air balance|owner witness|building envelope/i.test(`${item.title || ''} ${item.description || ''}`);
}

function normalizeInspectionReadinessGate(item) {
  item.requiredGate = readinessBoolean(item.requiredGate, inferRequiredInspectionGate(item));
  item.gateStage = READINESS_GATE_STAGES.some((stage) => stage.value === item.gateStage)
    ? item.gateStage
    : inferInspectionGateStage(item);
  item.blocksReadiness = readinessBoolean(item.blocksReadiness, item.requiredGate);
  item.affectedTrades = Array.isArray(item.affectedTrades)
    ? item.affectedTrades.map(String).filter(Boolean)
    : (item.trade ? [String(item.trade)] : []);
  return item;
}

function normalizeConstraintImpact(item) {
  if (!item.impact || typeof item.impact !== 'object') item.impact = {};
  const impact = item.impact;
  const safeScope = ['building', 'section', 'location', 'room'].includes(impact.scope) ? impact.scope : 'building';
  impact.scope = safeScope;
  impact.category = ['all', 'interior', 'exterior'].includes(impact.category) ? impact.category : 'all';
  impact.type = String(impact.type || (item.priority === 'critical' ? 'Work Blocked' : 'Schedule Risk'));
  impact.delayDays = Math.max(0, Number(impact.delayDays) || 0);
  impact.blocksReadiness = readinessBoolean(impact.blocksReadiness, item.priority === 'critical');
  impact.blockedStage = ['all', 'next-trade', 'inspection', 'turnover'].includes(impact.blockedStage)
    ? impact.blockedStage
    : (impact.blocksReadiness ? 'all' : 'turnover');
  impact.areaIds = Array.isArray(impact.areaIds) ? impact.areaIds.map(String).filter(Boolean) : [];
  impact.roomIds = Array.isArray(impact.roomIds) ? impact.roomIds.map(String).filter(Boolean) : [];
  impact.trades = Array.isArray(impact.trades) ? impact.trades.map(String).filter(Boolean) : [];
  impact.summary = String(impact.summary || '');

  if (!item.resolution || typeof item.resolution !== 'object') item.resolution = {};
  item.resolution.note = String(item.resolution.note || '');
  item.resolution.confirmed = readinessBoolean(item.resolution.confirmed, item.status === 'resolved');
  item.resolution.resolvedBy = String(item.resolution.resolvedBy || '');
  item.resolution.resolvedAt = String(item.resolution.resolvedAt || '');
  return item;
}

function normalizeHandoffRecord(item, target = data) {
  if (!item || typeof item !== 'object') return null;
  const room = (target.rooms || []).find((candidate) => candidate.id === item.roomId);
  const buildingId = recordScopeBuildingExists(target, item.buildingId)
    ? item.buildingId
    : (room?.buildingId || recordScopeDefaultBuildingId(target));
  const safeRoom = room && room.buildingId === buildingId
    ? room
    : (target.rooms || []).find((candidate) => candidate.buildingId === buildingId);
  if (!buildingId || !safeRoom) return null;

  item.id = String(item.id || nextId('handoff'));
  item.buildingId = buildingId;
  item.roomId = safeRoom.id;
  item.fromTrade = String(item.fromTrade || TRADE_META[0]?.name || 'Trade');
  item.toTrade = String(item.toTrade || HANDOFF_TRADE_SEQUENCE.find((trade) => trade !== item.fromTrade) || 'Turner');
  item.status = ['requested', 'accepted', 'rejected', 'cancelled'].includes(item.status) ? item.status : 'requested';
  item.dueDate = String(item.dueDate || dateOffset(2));
  item.note = String(item.note || '');
  item.requestedBy = String(item.requestedBy || CURRENT_USER);
  item.respondedBy = String(item.respondedBy || '');
  item.createdAt = String(item.createdAt || readinessNowIso());
  item.updatedAt = String(item.updatedAt || item.createdAt);
  item.attachments = normalizeAttachments(item.attachments);
  if (!Array.isArray(item.history)) item.history = [];
  item.history = item.history.filter(Boolean).map((entry) => ({
    id: String(entry.id || nextId('hh')),
    action: String(entry.action || 'updated'),
    note: String(entry.note || ''),
    user: String(entry.user || CURRENT_USER),
    createdAt: String(entry.createdAt || readinessNowIso())
  }));
  return item;
}

function roomQuickCode(room) {
  if (!room) return '';
  const buildingPart = String(room.buildingId || 'project').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
  const roomPart = String(room.number || room.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase();
  return `TS-${buildingPart}-${roomPart}`;
}

function normalizeReadinessWorkflowData(target) {
  if (!Array.isArray(target.handoffs)) target.handoffs = [];
  if (!Array.isArray(target.quickUpdates)) target.quickUpdates = [];
  if (!target.readinessSettings || typeof target.readinessSettings !== 'object') {
    target.readinessSettings = { useTurnerForOfficialProgress: true };
  }

  Object.values(target.tasksByRoom || {}).flat().forEach((task) => {
    ensureTaskInterfaceState(task);
    normalizeVerificationHistory(task);
  });

  (target.rooms || []).forEach((room) => {
    room.quickCode = String(room.quickCode || roomQuickCode(room));
  });

  (target.constraints || []).forEach(normalizeConstraintImpact);
  (target.inspections || []).forEach(normalizeInspectionReadinessGate);
  target.handoffs = target.handoffs.map((item) => normalizeHandoffRecord(item, target)).filter(Boolean);
  target.quickUpdates = target.quickUpdates.filter((item) => item && typeof item === 'object').slice(0, 100);
  return target;
}

buildDemoData = function buildDemoDataWithReadinessWorkflow() {
  return normalizeReadinessWorkflowData(readinessBuildDemoDataBase());
};

normalizeReadinessWorkflowData(data);
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not save the readiness workflow migration.', error);
}

function verificationHistoryForTask(task) {
  return normalizeVerificationHistory(task);
}

setTaskStatusForView = function setTaskStatusWithVerificationAudit(task, status, view = activeTaskInterface(), source = 'status-update') {
  ensureTaskInterfaceState(task);
  const safeView = view === 'trade' ? 'trade' : 'turner';
  const previousStatus = taskStatusForView(task, safeView);
  readinessSetTaskStatusBase(task, status, safeView);
  const nextStatus = taskStatusForView(task, safeView);
  if (previousStatus !== nextStatus) {
    verificationHistoryForTask(task).push({
      id: nextId('verify'),
      view: safeView,
      previousStatus,
      status: nextStatus,
      user: CURRENT_USER,
      source,
      createdAt: readinessNowIso()
    });
    task.verificationHistory = task.verificationHistory.slice(-100);
  }
  return task;
};
