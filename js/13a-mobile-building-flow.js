'use strict';

/* Mobile-first building entry flow and category-specific room creation. */

const mobileBuildingFlowRenderModalBase = renderModal;

if (ui.roomCategoryFilter !== 'exterior' && ui.roomCategoryFilter !== 'interior') {
  ui.roomCategoryFilter = 'interior';
}

function roomCategoryForBuilding(buildingId = ui.selectedBuildingId) {
  const saved = ui.roomCategoryFilter;
  if (saved === 'exterior' || saved === 'interior') return saved;
  return selectedBuildingAreaTab(buildingId);
}

function resetRoomListFilters({ keepCategory = true } = {}) {
  ui.roomLocationFilter = 'all';
  ui.roomFloorFilter = 'all';
  ui.roomFilter = 'all';
  ui.roomSearch = '';
  ui.roomPage = 1;
  ui.roomFilterPanelOpen = false;
  if (!keepCategory) ui.roomCategoryFilter = 'interior';
}

renderBuildingCard = function renderBuildingCardForMobileFlow(building) {
  normalizeProjectBuilding(building);
  const days = daysFromToday(building.dueDate);
  const counts = buildingLocationCounts(building);
  return `
    <article class="building-card building-card--with-areas building-card--mobile-flow">
      <button class="building-card__project" type="button" data-action="select-building" data-building="${escapeHtml(building.id)}" aria-label="Open ${escapeHtml(building.name)} and choose Interior or Exterior">
        <img class="building-card__image" src="${escapeHtml(building.image)}" alt="${escapeHtml(building.name)}" />
        <span class="building-card__content">
          <span class="building-card__title">${escapeHtml(building.name)}</span>
          <span class="small muted">${escapeHtml(building.address)}</span>
          <span class="building-card__meta">${icon('calendar')}<span>Due: <strong class="${days < 0 ? 'text-red' : ''}">${formatDate(building.dueDate)}</strong></span></span>
          <span class="progress-row">${makeProgress(building.progress)}<span class="progress-number">${building.progress}%</span></span>
          <span class="building-card__tap-hint">Tap to choose Interior or Exterior</span>
        </span>
        <span class="building-card__chevron" aria-hidden="true">${icon('chevron')}</span>
      </button>
      <div class="building-card__area-footer building-card__mobile-footer">
        <div class="building-card__category-summary" aria-label="Building section totals">
          <span class="building-category-pill building-category-pill--interior"><strong>${counts.interiorRooms}</strong> Interior</span>
          <span class="building-category-pill building-category-pill--exterior"><strong>${counts.exteriorRooms}</strong> Exterior</span>
        </div>
        <button class="building-remove-button" type="button" data-action="remove-building" data-building="${escapeHtml(building.id)}" aria-label="Remove ${escapeHtml(building.name)}">${icon('x')}<span>Remove</span></button>
      </div>
    </article>`;
};

function renderBuildingSectionChoiceModal() {
  const building = findProjectBuilding(ui.modal?.buildingId) || selectedBuilding();
  if (!building) return '';
  normalizeProjectBuilding(building);
  const counts = buildingLocationCounts(building);
  const body = `
    <div class="building-choice-header">
      <img src="${escapeHtml(building.image)}" alt="" />
      <div><strong>${escapeHtml(building.name)}</strong><span>${escapeHtml(building.address)}</span></div>
    </div>
    <p class="building-choice-copy">Choose the part of the building you want to work in. Interior and Exterior keep separate locations and room lists.</p>
    <div class="building-section-choice" role="group" aria-label="Choose Interior or Exterior">
      <button class="building-section-choice__button building-section-choice__button--interior" type="button" data-action="choose-building-category" data-building="${escapeHtml(building.id)}" data-category="interior">
        <span class="building-section-choice__icon">${icon('room')}</span>
        <span class="building-section-choice__copy"><strong>Interior</strong><small>Rooms, corridors, cores, rough-in, and finishes</small><span>${counts.interiorLocations} location${counts.interiorLocations === 1 ? '' : 's'} · ${counts.interiorRooms} room${counts.interiorRooms === 1 ? '' : 's'}</span></span>
        ${icon('chevron')}
      </button>
      <button class="building-section-choice__button building-section-choice__button--exterior" type="button" data-action="choose-building-category" data-building="${escapeHtml(building.id)}" data-category="exterior">
        <span class="building-section-choice__icon">${icon('building')}</span>
        <span class="building-section-choice__copy"><strong>Exterior</strong><small>Structure, roof, facade, envelope, and site-facing work</small><span>${counts.exteriorLocations} location${counts.exteriorLocations === 1 ? '' : 's'} · ${counts.exteriorRooms} work area${counts.exteriorRooms === 1 ? '' : 's'}</span></span>
        ${icon('chevron')}
      </button>
    </div>`;
  return modalShell('Choose Building Section', body, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button>`);
}

renderAddRoomModal = function renderCategorySpecificAddRoomModal() {
  const building = findProjectBuilding(ui.modal?.buildingId) || selectedBuilding();
  if (!building) return '';
  normalizeProjectBuilding(building);
  const category = ui.modal?.category === 'exterior' ? 'exterior' : ui.modal?.category === 'interior' ? 'interior' : roomCategoryForBuilding(building.id);
  const locations = building.areas.filter((area) => area.category === category);
  const preferredAreaId = ui.modal?.areaId && locations.some((area) => area.id === ui.modal.areaId)
    ? ui.modal.areaId
    : locations[0]?.id;
  const exterior = category === 'exterior';
  const title = exterior ? `Add Exterior Work Area to ${building.name}` : `Add Interior Room to ${building.name}`;
  const numberPlaceholder = exterior ? 'Example: EXT-01' : 'Example: 301';
  const namePlaceholder = exterior ? 'Example: North Roof Zone' : 'Example: Electrical Room';
  const floorValue = exterior ? 'Exterior' : 'Level 1';
  const options = locations.map((area) => `<option value="${escapeHtml(area.id)}" ${area.id === preferredAreaId ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('');
  return modalShell(title, `
    <form id="add-room-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <div class="field"><label for="new-room-number">${exterior ? 'Work-area number' : 'Room number'}</label><input class="input" id="new-room-number" name="number" required placeholder="${numberPlaceholder}" /></div>
      <div class="field"><label for="new-room-floor">Floor / level</label><input class="input" id="new-room-floor" name="floor" required value="${floorValue}" placeholder="Example: Level 3 or Roof" /></div>
      <div class="field field--full"><label for="new-room-name">${exterior ? 'Work-area name' : 'Room name'}</label><input class="input" id="new-room-name" name="name" required placeholder="${namePlaceholder}" /></div>
      <div class="field field--full"><label for="new-room-location">${locationCategoryLabel(category)} wing / location</label><select class="select" id="new-room-location" name="areaId" required ${locations.length ? '' : 'disabled'}>${options || '<option value="">No locations available</option>'}</select><div class="field-help">Only ${category} locations are shown. This ${exterior ? 'work area' : 'room'} will not appear in the other section.</div></div>
      ${locations.length ? '' : `<div class="empty-state field--full"><strong>Add a ${locationCategoryLabel(category).toLowerCase()} location first.</strong></div>`}
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-room-form" ${locations.length ? '' : 'disabled'}>Add ${exterior ? 'Work Area' : 'Room'}</button>`);
};

renderModal = function renderModalWithBuildingSectionChoice() {
  if (!ui.modal) return '';
  if (ui.modal.type === 'building-section-choice') return renderBuildingSectionChoiceModal();
  return mobileBuildingFlowRenderModalBase();
};

function openBuildingRoomsByCategory(buildingId, category) {
  const building = findProjectBuilding(buildingId);
  if (!building) return;
  const safeCategory = category === 'exterior' ? 'exterior' : 'interior';
  ui.selectedBuildingId = building.id;
  ui.roomCategoryFilter = safeCategory;
  setBuildingAreaTab(building.id, safeCategory);
  resetRoomListFilters({ keepCategory: true });
  const firstRoom = projectRoomsForBuilding(building.id, safeCategory)[0];
  if (firstRoom) ui.selectedRoomId = firstRoom.id;
  ui.modal = null;
  go('#rooms');
}

// Capture the main building-card action before the original handler navigates directly to Rooms.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'select-building') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const buildingId = trigger.dataset.building;
    if (!findProjectBuilding(buildingId)) return;
    ui.selectedBuildingId = buildingId;
    openModal('building-section-choice', { buildingId });
  } else if (action === 'choose-building-category') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openBuildingRoomsByCategory(trigger.dataset.building, trigger.dataset.category);
  } else if (action === 'room-category-select') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const category = trigger.dataset.category === 'exterior' ? 'exterior' : 'interior';
    ui.roomCategoryFilter = category;
    setBuildingAreaTab(ui.selectedBuildingId, category);
    resetRoomListFilters({ keepCategory: true });
    const firstRoom = projectRoomsForBuilding(ui.selectedBuildingId, category)[0];
    if (firstRoom) ui.selectedRoomId = firstRoom.id;
    render();
  }
}, true);

if (['home', 'rooms'].includes(route().view)) render();
