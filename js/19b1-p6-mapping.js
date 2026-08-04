'use strict';

/* Map a Primavera schedule into TradeSYNC buildings, rooms, tasks, constraints, gates, and handoffs. */

const P6_UNDO_STORAGE_KEY = 'tradesync-p6-undo-v1';
const P6_SCHEDULE_ACTIVITY_LIMIT = 2500;
const p6BuildDemoDataBase = buildDemoData;
let p6ImportInProgress = false;

const P6_TRADE_KEYWORDS = [
  { trade: 'Fire Protection', words: ['fire protection', 'sprinkler', 'standpipe', 'hydrostatic'] },
  { trade: 'Low Voltage', words: ['low voltage', 'telecom', 'data cabling', 'security', 'access control', 'fire alarm', 'audio visual', 'audiovisual'] },
  { trade: 'Electrical', words: ['electrical', 'electrician', 'power', 'conduit', 'cable tray', 'feeder', 'switchgear', 'panelboard', 'panel ', 'lighting', 'generator', 'ups'] },
  { trade: 'HVAC', words: ['hvac', 'mechanical', 'duct', 'air handler', 'ahu', 'vav', 'chiller', 'cooling', 'ventilation', 'air balance', 'mechanical controls'] },
  { trade: 'Plumbing', words: ['plumbing', 'plumber', 'domestic water', 'sanitary', 'storm drain', 'drainage', 'fixture', 'water piping', 'waste piping'] },
  { trade: 'Drywall', words: ['drywall', 'gypsum', 'gyp board', 'metal stud', 'wall framing', 'tape and finish', 'close-in'] },
  { trade: 'Flooring', words: ['flooring', 'carpet', 'terrazzo', 'epoxy floor', 'resilient floor', 'floor tile'] },
  { trade: 'Doors', words: ['door hardware', 'doors', 'door frame', 'lockset', 'hardware set'] },
  { trade: 'Millwork', words: ['millwork', 'casework', 'cabinet', 'countertop', 'solid surface'] },
  { trade: 'Finishes', words: ['paint', 'painting', 'finish', 'ceiling', 'acoustical', 'wall covering', 'caulk', 'touch-up', 'punch'] }
];

function p6NormalizeAppData(target) {
  if (!Array.isArray(target.p6Imports)) target.p6Imports = [];
  if (!target.p6ScheduleByBuilding || typeof target.p6ScheduleByBuilding !== 'object') target.p6ScheduleByBuilding = {};
  if (!target.p6Settings || typeof target.p6Settings !== 'object') {
    target.p6Settings = {
      updateTurnerActuals: true,
      createConstraints: true,
      createInspectionGates: true,
      createHandoffs: true,
      createUnassignedLocation: true
    };
  }
  return target;
}

buildDemoData = function buildDemoDataWithP6ScheduleSupport() {
  return p6NormalizeAppData(p6BuildDemoDataBase());
};

p6NormalizeAppData(data);
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not save the P6 data migration.', error);
}

const p6RecalculateBuildingProgressBase = typeof recalculateBuildingProgress === 'function' ? recalculateBuildingProgress : null;
const p6BuildingReadinessSummaryBase = typeof buildingReadinessSummary === 'function' ? buildingReadinessSummary : null;

if (p6RecalculateBuildingProgressBase) {
  recalculateBuildingProgress = function recalculateBuildingProgressWithoutScheduleHoldingRooms(buildingId, target = data) {
    const building = (target.buildings || []).find((item) => item.id === buildingId);
    if (!building) return 0;
    const rooms = (target.rooms || []).filter((room) => room.buildingId === buildingId && !room.excludeFromBuildingRollup);
    const roomProgress = rooms.map((room) => {
      const progress = officialRoomProgressForTarget(room, target);
      const tasks = target.tasksByRoom?.[room.id];
      if (Array.isArray(tasks) && tasks.length) {
        room.progress = progress;
        room.status = progress === 100 ? 'complete' : progress === 0 ? 'not-started' : 'incomplete';
      }
      return progress;
    });
    const progress = roomProgress.length ? Math.round(roomProgress.reduce((sum, value) => sum + value, 0) / roomProgress.length) : 0;
    building.progress = progress;
    building.progressSource = 'equal-room-average';
    building.progressRoomCount = rooms.length;
    building.progressUpdatedAt = new Date().toISOString();
    return progress;
  };
}

if (p6BuildingReadinessSummaryBase) {
  buildingReadinessSummary = function buildingReadinessWithoutScheduleHoldingRooms(buildingId) {
    const rooms = projectRoomsForBuilding(buildingId).filter((room) => !room.excludeFromReadinessRollup);
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
  };
}

function p6ImportOptionsFromFormData(formData) {
  const defaults = data.p6Settings || {};
  const checked = (name, fallback) => {
    if (!formData) return fallback;
    return formData.has(name) ? true : false;
  };
  return {
    updateTurnerActuals: checked('updateTurnerActuals', defaults.updateTurnerActuals !== false),
    createConstraints: checked('createConstraints', defaults.createConstraints !== false),
    createInspectionGates: checked('createInspectionGates', defaults.createInspectionGates !== false),
    createHandoffs: checked('createHandoffs', defaults.createHandoffs !== false),
    createUnassignedLocation: checked('createUnassignedLocation', defaults.createUnassignedLocation !== false)
  };
}

function p6StableId(prefix, buildingId, activityId) {
  const key = `${buildingId}-${activityId}`;
  return `${prefix}-${slugify(key) || String(key).replace(/[^a-z0-9]/gi, '').toLowerCase()}`.slice(0, 180);
}

function p6ActivitySearchText(activity) {
  return [
    activity.activityId,
    activity.name,
    activity.wbsPath,
    ...(activity.resourceNames || [])
  ].filter(Boolean).join(' | ').toLowerCase();
}

function p6DetectTrade(activity) {
  const text = p6ActivitySearchText(activity);
  const match = P6_TRADE_KEYWORDS.find((entry) => entry.words.some((word) => text.includes(word)));
  return match?.trade || '';
}

function p6DetectAllTrades(activity) {
  const text = p6ActivitySearchText(activity);
  return P6_TRADE_KEYWORDS
    .map((entry) => {
      const positions = entry.words.map((word) => text.indexOf(word)).filter((position) => position >= 0);
      return positions.length ? { trade: entry.trade, position: Math.min(...positions) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.trade)
    .filter((trade, index, values) => values.indexOf(trade) === index);
}

function p6DetectCategory(activity) {
  const text = p6ActivitySearchText(activity);
  if (/exterior|facade|fa[cç]ade|roof|sitework|site work|envelope|elevation|loading dock|yard|parking/.test(text)) return 'exterior';
  return 'interior';
}

function p6EscapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function p6FindAreaForActivity(building, activity, category = p6DetectCategory(activity)) {
  const text = p6ActivitySearchText(activity);
  const areas = (building.areas || []).filter((area) => area.category === category);
  const exact = areas
    .filter((area) => String(area.name || '').length >= 3)
    .sort((a, b) => b.name.length - a.name.length)
    .find((area) => text.includes(String(area.name).toLowerCase()));
  if (exact) return exact;

  const wbsSegments = String(activity.wbsPath || '').split('>').map((segment) => segment.trim().toLowerCase()).filter(Boolean);
  const segmentMatch = areas.find((area) => wbsSegments.includes(String(area.name).toLowerCase()));
  if (segmentMatch) return segmentMatch;

  return null;
}

function p6FindRoomForActivity(building, activity) {
  const rooms = projectRoomsForBuilding(building.id);
  if (!rooms.length) return null;
  const text = p6ActivitySearchText(activity);
  const wbsSegments = String(activity.wbsPath || '').split('>').map((segment) => segment.trim().toLowerCase()).filter(Boolean);

  const explicit = rooms
    .slice()
    .sort((a, b) => String(b.number).length - String(a.number).length)
    .find((room) => {
      const number = p6EscapeRegExp(room.number);
      const pattern = new RegExp(`(?:room|rm\\.?|area|zone|space)\\s*#?\\s*${number}(?:\\b|$)`, 'i');
      return pattern.test(text);
    });
  if (explicit) return explicit;

  const segmentMatch = rooms.find((room) => {
    const number = String(room.number || '').toLowerCase();
    const name = String(room.name || '').toLowerCase();
    return wbsSegments.some((segment) => segment === number || segment === name || segment === `room ${number}` || segment === `area ${number}` || (number && name && segment.includes(number) && segment.includes(name)));
  });
  if (segmentMatch) return segmentMatch;

  const nameMatch = rooms
    .filter((room) => String(room.name || '').length >= 5)
    .sort((a, b) => b.name.length - a.name.length)
    .find((room) => text.includes(String(room.name).toLowerCase()));
  return nameMatch || null;
}

function p6EnsureUnassignedRoom(building, category) {
  normalizeProjectBuilding(building);
  const safeCategory = category === 'exterior' ? 'exterior' : 'interior';
  const roomId = `${building.id}-p6-unassigned-${safeCategory}`;
  let room = data.rooms.find((item) => item.id === roomId);
  if (room) return room;

  let area = (building.areas || []).find((item) => item.category === safeCategory && item.name === `P6 Schedule - ${locationCategoryLabel(safeCategory)}`);
  if (!area) {
    area = normalizeProjectArea({
      id: `area-${building.id}-p6-${safeCategory}`,
      buildingId: building.id,
      name: `P6 Schedule - ${locationCategoryLabel(safeCategory)}`,
      category: safeCategory,
      phase: safeCategory === 'exterior' ? 'Structure / Shell' : 'Interior Build-Out',
      description: 'Activities imported from P6 that did not include a specific TradeSYNC room or work-area reference.',
      attachments: [],
      createdAt: new Date().toISOString()
    }, building.id);
    building.areas.push(area);
  }

  room = {
    id: roomId,
    buildingId: building.id,
    areaId: area.id,
    category: safeCategory,
    number: safeCategory === 'exterior' ? 'P6-EXT' : 'P6-INT',
    name: 'P6 Unassigned Schedule',
    location: area.name,
    floor: safeCategory === 'exterior' ? 'Exterior' : 'Schedule',
    level: safeCategory === 'exterior' ? 'Exterior' : 'Schedule',
    progress: 0,
    status: 'not-started',
    clashes: 0,
    p6Generated: true,
    excludeFromBuildingRollup: true,
    excludeFromReadinessRollup: true,
    quickCode: ''
  };
  room.quickCode = roomQuickCode(room);
  data.rooms.push(room);
  data.tasksByRoom[room.id] = [];
  return room;
}

function p6TaskList(roomId) {
  if (!Array.isArray(data.tasksByRoom[roomId])) data.tasksByRoom[roomId] = [];
  return data.tasksByRoom[roomId];
}

function p6FindTaskByActivity(buildingId, projectKey, activityId) {
  for (const [roomId, tasks] of Object.entries(data.tasksByRoom || {})) {
    const room = data.rooms.find((item) => item.id === roomId);
    if (!room || room.buildingId !== buildingId || !Array.isArray(tasks)) continue;
    const task = tasks.find((item) => item.p6?.projectKey === projectKey && item.p6?.activityId === activityId);
    if (task) return { task, roomId, tasks };
  }
  return null;
}

function p6TaskTitleKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
