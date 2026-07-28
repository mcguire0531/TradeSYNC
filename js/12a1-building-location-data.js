'use strict';

/* Separate interior/exterior building locations, room creation, room filters, and building removal. */

const buildingTabsRenderModalBase = renderModal;
const buildingTabsBuildDemoDataBase = buildDemoData;
const buildingTabsAddBuildingAreaFromFormBase = addBuildingAreaFromForm;
const buildingTabsAddBuildingFromAccessCodeBase = addBuildingFromAccessCode;
const buildingTabsSelectedRoomBase = selectedRoom;

if (!ui.buildingAreaTabs || typeof ui.buildingAreaTabs !== 'object') ui.buildingAreaTabs = {};
if (!ui.roomLocationFilter) ui.roomLocationFilter = 'all';
if (!ui.roomFloorFilter) ui.roomFloorFilter = 'all';
if (typeof ui.roomFilterPanelOpen !== 'boolean') ui.roomFilterPanelOpen = false;

function locationCategoryLabel(category) {
  return category === 'exterior' ? 'Exterior' : 'Interior';
}

function locationPhaseForCategory(category) {
  return category === 'exterior' ? 'Structure / Shell' : 'Interior Build-Out';
}

function projectRoomsForBuilding(buildingId, category = null) {
  return data.rooms.filter((room) => room.buildingId === buildingId && (!category || room.category === category));
}

function ensureProjectLocation(building, category, name, description = '') {
  normalizeProjectBuilding(building);
  const safeCategory = category === 'exterior' ? 'exterior' : 'interior';
  const key = String(name || '').trim().toLowerCase();
  let area = building.areas.find((item) => item.category === safeCategory && item.name.trim().toLowerCase() === key);
  if (area) return area;
  area = normalizeProjectArea({
    id: `area-${building.id}-${safeCategory}-${slugify(name) || nextId('location')}`,
    buildingId: building.id,
    name: String(name || (safeCategory === 'exterior' ? 'Exterior Location' : 'Interior Location')).trim(),
    category: safeCategory,
    phase: locationPhaseForCategory(safeCategory),
    description,
    attachments: [],
    createdAt: new Date().toISOString()
  }, building.id);
  building.areas.push(area);
  return area;
}

function normalizeRoomBuildingData(target) {
  normalizeProjectBuildings(target);
  const fallbackBuilding = target.buildings.find((building) => building.id === 'riverside') || target.buildings[0];
  if (!fallbackBuilding) return target;

  target.rooms.forEach((room) => {
    room.buildingId = String(room.buildingId || fallbackBuilding.id);
    const building = target.buildings.find((item) => item.id === room.buildingId) || fallbackBuilding;
    room.buildingId = building.id;
    room.category = room.category === 'exterior' ? 'exterior' : 'interior';
    room.floor = String(room.floor || room.level || 'Level 1');
    room.level = room.floor;
    const locationName = String(room.location || (room.category === 'exterior' ? 'Building Exterior & Structure' : 'Interior Build-Out'));
    let area = building.areas.find((item) => item.id === room.areaId && item.category === room.category);
    if (!area) area = ensureProjectLocation(building, room.category, locationName);
    room.areaId = area.id;
    room.location = area.name;
  });

  target.buildings.forEach((building) => {
    normalizeProjectBuilding(building);
    if (!building.areas.some((area) => area.category === 'exterior')) {
      ensureProjectLocation(building, 'exterior', 'Building Exterior & Structure');
    }
    if (!building.areas.some((area) => area.category === 'interior')) {
      ensureProjectLocation(building, 'interior', 'Interior Build-Out');
    }
  });
  return target;
}

buildDemoData = function buildDemoDataWithSeparatedLocations() {
  return normalizeRoomBuildingData(buildingTabsBuildDemoDataBase());
};

normalizeRoomBuildingData(data);
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not save the room and location migration.', error);
}

selectedRoom = function selectedRoomWithBuildingContext() {
  const direct = data.rooms.find((room) => room.id === ui.selectedRoomId);
  const currentView = (location.hash || '#home').slice(1).split('/')[0];
  if (direct) {
    const selectedBuildingStillExists = data.buildings.some((building) => building.id === ui.selectedBuildingId);
    if (currentView === 'tasks' && selectedBuildingStillExists && direct.buildingId !== ui.selectedBuildingId) {
      const buildingRoom = projectRoomsForBuilding(ui.selectedBuildingId)[0];
      if (buildingRoom) {
        ui.selectedRoomId = buildingRoom.id;
        return buildingRoom;
      }
    }
    if (direct.buildingId && data.buildings.some((building) => building.id === direct.buildingId)) {
      ui.selectedBuildingId = direct.buildingId;
    }
    return direct;
  }
  const buildingRoom = projectRoomsForBuilding(ui.selectedBuildingId)[0];
  if (buildingRoom) {
    ui.selectedRoomId = buildingRoom.id;
    return buildingRoom;
  }
  return buildingTabsSelectedRoomBase();
};

function selectedBuildingAreaTab(buildingId) {
  const saved = ui.buildingAreaTabs[buildingId];
  return saved === 'exterior' ? 'exterior' : 'interior';
}

function setBuildingAreaTab(buildingId, category) {
  ui.buildingAreaTabs[buildingId] = category === 'exterior' ? 'exterior' : 'interior';
}

function buildingLocationCounts(building) {
  normalizeProjectBuilding(building);
  const rooms = projectRoomsForBuilding(building.id);
  return {
    interiorLocations: building.areas.filter((area) => area.category === 'interior').length,
    exteriorLocations: building.areas.filter((area) => area.category === 'exterior').length,
    interiorRooms: rooms.filter((room) => room.category === 'interior').length,
    exteriorRooms: rooms.filter((room) => room.category === 'exterior').length
  };
}

renderBuildingCard = function renderBuildingCardWithSeparateLocationTabs(building) {
  normalizeProjectBuilding(building);
  const days = daysFromToday(building.dueDate);
  const counts = buildingLocationCounts(building);
  return `
    <article class="building-card building-card--with-areas building-card--location-tabs">
      <button class="building-card__project" type="button" data-action="select-building" data-building="${escapeHtml(building.id)}">
        <img class="building-card__image" src="${escapeHtml(building.image)}" alt="${escapeHtml(building.name)}" />
        <span class="building-card__content">
          <span class="building-card__title">${escapeHtml(building.name)}</span>
          <span class="small muted">${escapeHtml(building.address)}</span>
          <span class="building-card__meta">${icon('calendar')}<span>Due: <strong class="${days < 0 ? 'text-red' : ''}">${formatDate(building.dueDate)}</strong></span></span>
          <span class="progress-row">${makeProgress(building.progress)}<span class="progress-number">${building.progress}%</span></span>
        </span>
        <span class="building-card__chevron" aria-hidden="true">${icon('chevron')}</span>
      </button>
      <div class="building-card__area-footer building-card__location-footer">
        <div class="building-card__section-tabs" aria-label="${escapeHtml(building.name)} locations">
          <button class="building-section-tab building-section-tab--interior" type="button" data-action="open-building-section" data-building="${escapeHtml(building.id)}" data-category="interior">
            <span>Interior</span><small>${counts.interiorLocations} locations · ${counts.interiorRooms} rooms</small>
          </button>
          <button class="building-section-tab building-section-tab--exterior" type="button" data-action="open-building-section" data-building="${escapeHtml(building.id)}" data-category="exterior">
            <span>Exterior</span><small>${counts.exteriorLocations} locations · ${counts.exteriorRooms} rooms</small>
          </button>
        </div>
        <button class="building-remove-button" type="button" data-action="remove-building" data-building="${escapeHtml(building.id)}" aria-label="Remove ${escapeHtml(building.name)}">${icon('x')}<span>Remove</span></button>
      </div>
    </article>`;
};
