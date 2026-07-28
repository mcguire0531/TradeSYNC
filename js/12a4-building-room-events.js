'use strict';

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'open-building-section') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const buildingId = trigger.dataset.building;
    ui.selectedBuildingId = buildingId;
    setBuildingAreaTab(buildingId, trigger.dataset.category);
    openModal('building-areas', { buildingId });
  } else if (action === 'building-area-tab') {
    event.preventDefault();
    event.stopImmediatePropagation();
    setBuildingAreaTab(trigger.dataset.building, trigger.dataset.category);
    ui.modal = { type: 'building-areas', buildingId: trigger.dataset.building };
    render();
  } else if (action === 'open-add-room') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const buildingId = trigger.dataset.building || ui.selectedBuildingId;
    if (trigger.dataset.category) setBuildingAreaTab(buildingId, trigger.dataset.category);
    openModal('add-room', { buildingId, category: trigger.dataset.category, areaId: trigger.dataset.area });
  } else if (action === 'open-room-from-location') {
    event.preventDefault();
    event.stopImmediatePropagation();
    ui.selectedBuildingId = trigger.dataset.building;
    ui.selectedRoomId = trigger.dataset.room;
    ui.modal = null;
    ensureRoomWorkspace(ui.selectedRoomId);
    go(`#room/${encodeURIComponent(ui.selectedRoomId)}`);
  } else if (action === 'remove-building') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('remove-building', { buildingId: trigger.dataset.building });
  } else if (action === 'confirm-remove-building') {
    event.preventDefault();
    event.stopImmediatePropagation();
    removeBuilding(trigger.dataset.building);
  } else if (action === 'toggle-room-filters') {
    event.preventDefault();
    event.stopImmediatePropagation();
    ui.roomFilterPanelOpen = !ui.roomFilterPanelOpen;
    render();
  } else if (action === 'reset-room-filters') {
    event.preventDefault();
    event.stopImmediatePropagation();
    ui.roomLocationFilter = 'all';
    ui.roomFloorFilter = 'all';
    ui.roomFilter = 'all';
    ui.roomPage = 1;
    render();
  } else if (action === 'select-building') {
    ui.roomLocationFilter = 'all';
    ui.roomFloorFilter = 'all';
    ui.roomFilter = 'all';
    ui.roomPage = 1;
  }
}, true);

document.addEventListener('change', (event) => {
  const control = event.target.dataset.control;
  if (control === 'room-location-filter-v2') {
    event.stopImmediatePropagation();
    ui.roomLocationFilter = event.target.value;
    ui.roomPage = 1;
    render();
  } else if (control === 'room-floor-filter-v2') {
    event.stopImmediatePropagation();
    ui.roomFloorFilter = event.target.value;
    ui.roomPage = 1;
    render();
  } else if (control === 'room-status-filter-v2') {
    event.stopImmediatePropagation();
    ui.roomFilter = event.target.value;
    ui.roomPage = 1;
    render();
  }
}, true);

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'add-room-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  addRoomFromForm(new FormData(event.target));
}, true);

if (['home', 'rooms', 'room', 'tasks'].includes(route().view)) render();
