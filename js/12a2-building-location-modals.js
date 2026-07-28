'use strict';

function roomsForProjectLocation(buildingId, areaId) {
  return data.rooms.filter((room) => room.buildingId === buildingId && room.areaId === areaId);
}

function renderProjectLocationCard(area, building) {
  const rooms = roomsForProjectLocation(building.id, area.id);
  return `
    <article class="project-location-card">
      <div class="project-location-card__head">
        <div><span class="project-area-card__type project-area-card__type--${area.category}">${locationCategoryLabel(area.category)}</span><span class="small muted">${escapeHtml(area.phase)}</span></div>
        <button class="button button--secondary button--small" type="button" data-action="open-add-room" data-building="${escapeHtml(building.id)}" data-category="${escapeHtml(area.category)}" data-area="${escapeHtml(area.id)}">${icon('plus')}Add Room</button>
      </div>
      <h3>${escapeHtml(area.name)}</h3>
      <p class="muted small">${escapeHtml(area.description || 'No location description added.')}</p>
      ${area.attachments.length ? renderAttachmentGallery(area.attachments, true) : ''}
      <div class="project-location-rooms">
        <div class="project-location-rooms__head"><strong>Rooms / Work Areas</strong><span class="count-pill">${rooms.length}</span></div>
        ${rooms.length ? `<div class="project-location-room-list">${rooms.map((room) => `
          <button class="project-location-room" type="button" data-action="open-room-from-location" data-building="${escapeHtml(building.id)}" data-room="${escapeHtml(room.id)}">
            <span><strong>Room ${escapeHtml(room.number)}</strong><small>${escapeHtml(room.name)} · ${escapeHtml(room.floor)}</small></span>${roomStatusMarkup(room)}${icon('chevron')}
          </button>`).join('')}</div>` : `<div class="project-location-empty">No rooms have been added to this location.</div>`}
      </div>
    </article>`;
}

renderBuildingAreasModal = function renderBuildingAreasWithTabs() {
  const building = findProjectBuilding(ui.modal?.buildingId) || selectedBuilding();
  if (!building) return '';
  normalizeProjectBuilding(building);
  const category = selectedBuildingAreaTab(building.id);
  const areas = building.areas.filter((area) => area.category === category);
  const interiorLocations = building.areas.filter((area) => area.category === 'interior').length;
  const exteriorLocations = building.areas.filter((area) => area.category === 'exterior').length;
  const interiorRooms = projectRoomsForBuilding(building.id, 'interior').length;
  const exteriorRooms = projectRoomsForBuilding(building.id, 'exterior').length;
  const body = `
    <div class="building-area-modal__header">
      <img src="${escapeHtml(building.image)}" alt="" />
      <div><strong>${escapeHtml(building.name)}</strong><span>${escapeHtml(building.address)}</span></div>
    </div>
    <div class="building-location-tabs" role="tablist" aria-label="Interior and exterior locations">
      <button class="building-location-tab ${category === 'interior' ? 'is-active' : ''}" type="button" data-action="building-area-tab" data-building="${escapeHtml(building.id)}" data-category="interior" role="tab" aria-selected="${category === 'interior'}"><span>Interior</span><small>${interiorLocations} locations · ${interiorRooms} rooms</small></button>
      <button class="building-location-tab building-location-tab--exterior ${category === 'exterior' ? 'is-active' : ''}" type="button" data-action="building-area-tab" data-building="${escapeHtml(building.id)}" data-category="exterior" role="tab" aria-selected="${category === 'exterior'}"><span>Exterior</span><small>${exteriorLocations} locations · ${exteriorRooms} rooms</small></button>
    </div>
    <p class="building-area-explanation">${category === 'exterior'
      ? 'Exterior locations track structure, roof, facade, envelope, and site-facing work before interior trades can proceed.'
      : 'Interior locations track rooms, corridors, cores, rough-in, finishes, and turnover work inside the building.'}</p>
    <section class="building-area-group">
      <div class="documentation-section__head"><h3>${locationCategoryLabel(category)} Locations</h3><span class="count-pill">${areas.length}</span></div>
      <div class="project-location-grid">${areas.map((area) => renderProjectLocationCard(area, building)).join('') || `<div class="empty-state"><strong>No ${locationCategoryLabel(category).toLowerCase()} locations yet.</strong><p class="muted small no-margin">Add a location before adding rooms.</p></div>`}</div>
    </section>`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--secondary" type="button" data-action="open-add-building-area" data-building="${escapeHtml(building.id)}">${icon('plus')}Add ${locationCategoryLabel(category)} Location</button><button class="button button--primary" type="button" data-action="open-add-room" data-building="${escapeHtml(building.id)}" data-category="${escapeHtml(category)}">${icon('plus')}Add Room</button>`;
  return modalShell(`${building.name} Locations`, body, footer);
};

renderAddBuildingAreaModal = function renderAddBuildingLocationModal() {
  const building = findProjectBuilding(ui.modal?.buildingId) || selectedBuilding();
  if (!building) return '';
  const category = selectedBuildingAreaTab(building.id);
  return modalShell(`Add Location to ${building.name}`, `
    <form id="add-building-area-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <div class="field field--full"><label for="project-area-name">Location name</label><input class="input" id="project-area-name" name="name" required placeholder="Example: Level 1 Core, Roof, or North Elevation" /></div>
      <div class="field"><label for="project-area-category">Location type</label><select class="select" id="project-area-category" name="category"><option value="interior" ${category === 'interior' ? 'selected' : ''}>Interior</option><option value="exterior" ${category === 'exterior' ? 'selected' : ''}>Exterior</option></select></div>
      <div class="field"><label for="project-area-phase">Project phase</label><select class="select" id="project-area-phase" name="phase"><option>Structure / Shell</option><option>Exterior Envelope</option><option>Roofing</option><option>Interior Build-Out</option><option>MEP Rough-In</option><option>Finishes</option><option>Closeout</option></select></div>
      <div class="field field--full"><label for="project-area-description">Description</label><textarea class="textarea" id="project-area-description" name="description" required placeholder="Describe the limits of this location and the work tracked here"></textarea></div>
      ${renderImageUploadField({ id: 'project-area-images', name: 'projectAreaImages', label: 'Location images', help: 'Optional. Upload site photos, elevations, plans, or marked-up location images.' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="back-to-building-areas" data-building="${escapeHtml(building.id)}">Back</button><button class="button button--primary" type="submit" form="add-building-area-form">Add Location</button>`);
};

function renderAddRoomModal() {
  const building = findProjectBuilding(ui.modal?.buildingId) || selectedBuilding();
  if (!building) return '';
  normalizeProjectBuilding(building);
  const preferredCategory = ui.modal?.category === 'exterior' ? 'exterior' : 'interior';
  const preferredAreaId = ui.modal?.areaId || building.areas.find((area) => area.category === preferredCategory)?.id || building.areas[0]?.id;
  const groupedOptions = ['interior', 'exterior'].map((category) => {
    const locations = building.areas.filter((area) => area.category === category);
    if (!locations.length) return '';
    return `<optgroup label="${locationCategoryLabel(category)} Locations">${locations.map((area) => `<option value="${escapeHtml(area.id)}" ${area.id === preferredAreaId ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('')}</optgroup>`;
  }).join('');
  return modalShell(`Add Room to ${building.name}`, `
    <form id="add-room-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <div class="field"><label for="new-room-number">Room / area number</label><input class="input" id="new-room-number" name="number" required placeholder="Example: 301 or EXT-01" /></div>
      <div class="field"><label for="new-room-floor">Floor / level</label><input class="input" id="new-room-floor" name="floor" required value="Level 1" placeholder="Example: Level 3 or Roof" /></div>
      <div class="field field--full"><label for="new-room-name">Room / work area name</label><input class="input" id="new-room-name" name="name" required placeholder="Example: Electrical Room or North Roof Zone" /></div>
      <div class="field field--full"><label for="new-room-location">Interior or exterior location</label><select class="select" id="new-room-location" name="areaId" required>${groupedOptions}</select><div class="field-help">Interior and exterior locations stay separate. A room appears only under the location selected here.</div></div>
    </form>`, `<button class="button button--secondary" type="button" data-action="back-to-building-areas" data-building="${escapeHtml(building.id)}">Cancel</button><button class="button button--primary" type="submit" form="add-room-form">Add Room</button>`);
}

function renderRemoveBuildingModal() {
  const building = findProjectBuilding(ui.modal?.buildingId);
  if (!building) return '';
  const rooms = projectRoomsForBuilding(building.id);
  const canRemove = data.buildings.length > 1;
  const body = `<div class="remove-building-warning">${icon('alert')}<div><strong>Remove ${escapeHtml(building.name)}?</strong><p>This removes the building, its ${rooms.length} room${rooms.length === 1 ? '' : 's'}, and their locally saved task records from this browser.</p>${canRemove ? '' : '<p class="text-red strong">At least one building must remain in TradeSYNC.</p>'}</div></div>`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--danger" type="button" data-action="confirm-remove-building" data-building="${escapeHtml(building.id)}" ${canRemove ? '' : 'disabled'}>Remove Building</button>`;
  return modalShell('Remove Building', body, footer);
}

renderModal = function renderModalWithRoomAndBuildingManagement() {
  if (!ui.modal) return '';
  if (ui.modal.type === 'add-room') return renderAddRoomModal();
  if (ui.modal.type === 'remove-building') return renderRemoveBuildingModal();
  return buildingTabsRenderModalBase();
};

addBuildingAreaFromForm = async function addSeparatedBuildingLocationFromForm(formData) {
  try {
    const building = findProjectBuilding(String(formData.get('buildingId')));
    if (!building) return;
    const attachments = await attachmentsFromForm(formData, 'projectAreaImages');
    const category = String(formData.get('category')) === 'exterior' ? 'exterior' : 'interior';
    const area = normalizeProjectArea({
      id: nextId('area'),
      buildingId: building.id,
      name: String(formData.get('name') || '').trim(),
      category,
      phase: String(formData.get('phase') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      attachments,
      createdAt: new Date().toISOString()
    }, building.id);
    building.areas.push(area);
    if (!persistWithRollback(() => {
      const index = building.areas.indexOf(area);
      if (index >= 0) building.areas.splice(index, 1);
    })) return;
    setBuildingAreaTab(building.id, category);
    ui.modal = { type: 'building-areas', buildingId: building.id };
    render();
    toast(`${area.name} was added as an ${category} location.`);
  } catch (error) {
    console.warn('TradeSYNC could not add the building location.', error);
    toast(error.message || 'The location could not be added.');
  }
};

addBuildingFromAccessCode = function addBuildingFromAccessCodeWithLocations(formData) {
  buildingTabsAddBuildingFromAccessCodeBase(formData);
  normalizeRoomBuildingData(data);
  const building = selectedBuilding();
  if (building) setBuildingAreaTab(building.id, 'interior');
  try { saveData(); } catch (error) { console.warn('TradeSYNC could not save the building locations.', error); }
  render();
};

function addRoomFromForm(formData) {
  const building = findProjectBuilding(String(formData.get('buildingId')));
  if (!building) return;
  const area = building.areas.find((item) => item.id === String(formData.get('areaId')));
  if (!area) {
    toast('Choose a valid interior or exterior location.');
    return;
  }
  const number = String(formData.get('number') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const floor = String(formData.get('floor') || '').trim();
  if (!number || !name || !floor) return;
  if (projectRoomsForBuilding(building.id).some((room) => room.number.toLowerCase() === number.toLowerCase())) {
    toast(`Room ${number} already exists in ${building.name}.`);
    return;
  }
  const room = {
    id: `${building.id}-${slugify(number) || nextId('room')}-${Date.now().toString(36)}`,
    buildingId: building.id,
    areaId: area.id,
    category: area.category,
    number,
    name,
    location: area.name,
    floor,
    level: floor,
    progress: 0,
    status: 'not-started',
    clashes: 0
  };
  data.rooms.push(room);
  data.tasksByRoom[room.id] = [];
  setBuildingAreaTab(building.id, area.category);
  ui.selectedBuildingId = building.id;
  ui.selectedRoomId = room.id;
  saveData();
  ui.modal = { type: 'building-areas', buildingId: building.id };
  render();
  toast(`Room ${number} was added to ${area.name}.`);
}

function removeBuilding(buildingId) {
  const building = findProjectBuilding(buildingId);
  if (!building) return;
  if (data.buildings.length <= 1) {
    toast('At least one building must remain in TradeSYNC.');
    return;
  }
  const removedRooms = projectRoomsForBuilding(building.id);
  const removedRoomIds = new Set(removedRooms.map((room) => room.id));
  data.rooms = data.rooms.filter((room) => room.buildingId !== building.id);
  removedRoomIds.forEach((roomId) => delete data.tasksByRoom[roomId]);
  data.buildings = data.buildings.filter((item) => item.id !== building.id);
  delete ui.buildingAreaTabs[building.id];
  const nextBuilding = data.buildings[0];
  ui.selectedBuildingId = nextBuilding.id;
  const nextRoom = projectRoomsForBuilding(nextBuilding.id)[0] || data.rooms[0];
  ui.selectedRoomId = nextRoom?.id || '';
  ui.roomLocationFilter = 'all';
  ui.roomFloorFilter = 'all';
  ui.roomFilter = 'all';
  ui.roomPage = 1;
  saveData();
  ui.modal = null;
  go('#home');
  toast(`${building.name} was removed from My Buildings.`);
}

function roomFilterCount() {
  return [ui.roomLocationFilter, ui.roomFloorFilter, ui.roomFilter].filter((value) => value && value !== 'all').length;
}
