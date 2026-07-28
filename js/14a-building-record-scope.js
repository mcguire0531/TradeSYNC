'use strict';

/* Building-level scope for constraints and building/room scope for inspections. */

const buildingRecordScopeBuildDemoDataBase = buildDemoData;
const buildingRecordScopeRemoveBuildingBase = removeBuilding;

function recordScopeDefaultBuildingId(target = data) {
  const buildings = target?.buildings || [];
  return buildings.find((building) => building.id === 'riverside')?.id || buildings[0]?.id || '';
}

function recordScopeBuildingExists(target, buildingId) {
  return Boolean((target?.buildings || []).some((building) => building.id === buildingId));
}

function recordScopeRoomForBuilding(target, buildingId, preferredRoomId = '') {
  const rooms = (target?.rooms || []).filter((room) => room.buildingId === buildingId);
  return rooms.find((room) => room.id === preferredRoomId)
    || rooms.find((room) => room.number === '205')
    || rooms[0]
    || null;
}

function normalizeBuildingRecordScope(target) {
  const fallbackBuildingId = recordScopeDefaultBuildingId(target);

  (target.constraints || []).forEach((constraint) => {
    const safeBuildingId = recordScopeBuildingExists(target, constraint.buildingId)
      ? constraint.buildingId
      : fallbackBuildingId;
    constraint.buildingId = safeBuildingId;
    // Constraints are intentionally building-level records, never room records.
    if ('roomId' in constraint) delete constraint.roomId;
  });

  (target.inspections || []).forEach((inspection) => {
    const existingRoom = (target.rooms || []).find((room) => room.id === inspection.roomId);
    const safeBuildingId = recordScopeBuildingExists(target, inspection.buildingId)
      ? inspection.buildingId
      : (existingRoom?.buildingId || fallbackBuildingId);
    inspection.buildingId = safeBuildingId;
    const room = recordScopeRoomForBuilding(target, safeBuildingId, inspection.roomId);
    inspection.roomId = room?.id || '';
  });

  return target;
}

buildDemoData = function buildDemoDataWithBuildingRecordScope() {
  return normalizeBuildingRecordScope(buildingRecordScopeBuildDemoDataBase());
};

normalizeBuildingRecordScope(data);
if (!recordScopeBuildingExists(data, ui.selectedBuildingId)) {
  ui.selectedBuildingId = recordScopeDefaultBuildingId(data);
}
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not save the building record migration.', error);
}

function scopedBuilding() {
  if (!recordScopeBuildingExists(data, ui.selectedBuildingId)) {
    ui.selectedBuildingId = recordScopeDefaultBuildingId(data);
  }
  return data.buildings.find((building) => building.id === ui.selectedBuildingId) || data.buildings[0] || null;
}

function constraintsForBuilding(buildingId = scopedBuilding()?.id) {
  return data.constraints.filter((constraint) => constraint.buildingId === buildingId);
}

function inspectionRoomsForBuilding(buildingId = scopedBuilding()?.id) {
  return projectRoomsForBuilding(buildingId);
}

function ensureInspectionRoomForBuilding(buildingId = scopedBuilding()?.id) {
  const room = recordScopeRoomForBuilding(data, buildingId, ui.selectedRoomId);
  ui.selectedRoomId = room?.id || '';
  return room;
}

function inspectionsForScope({
  buildingId = scopedBuilding()?.id,
  roomId = ui.selectedRoomId,
  trade = null
} = {}) {
  return data.inspections.filter((inspection) => {
    const matchesBuilding = inspection.buildingId === buildingId;
    const matchesRoom = !roomId || inspection.roomId === roomId;
    const matchesTrade = !trade || inspection.trade === trade;
    return matchesBuilding && matchesRoom && matchesTrade;
  });
}

inspectionCounts = function inspectionCountsForBuildingRoom(trade = null) {
  const list = inspectionsForScope({ trade });
  return {
    passed: list.filter((item) => item.status === 'passed').length,
    failed: list.filter((item) => item.status === 'failed').length,
    pending: list.filter((item) => item.status === 'not-inspected').length,
    total: list.length
  };
};

function renderBuildingScopeSelect(controlName, label, helperText = '') {
  const building = scopedBuilding();
  if (!building) return '';
  return `
    <label class="record-scope-field">
      <span>${escapeHtml(label)}</span>
      <select class="record-scope-select" data-control="${escapeHtml(controlName)}" aria-label="${escapeHtml(label)}">
        ${data.buildings.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === building.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}
      </select>
      ${helperText ? `<small>${escapeHtml(helperText)}</small>` : ''}
    </label>`;
}

removeBuilding = function removeBuildingWithScopedRecords(buildingId) {
  if (data.buildings.length <= 1) {
    buildingRecordScopeRemoveBuildingBase(buildingId);
    return;
  }
  data.constraints = data.constraints.filter((constraint) => constraint.buildingId !== buildingId);
  data.inspections = data.inspections.filter((inspection) => inspection.buildingId !== buildingId);
  buildingRecordScopeRemoveBuildingBase(buildingId);
};
