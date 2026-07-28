'use strict';

renderRooms = function renderRoomsWithLocationFloorStatusFilters() {
  const building = selectedBuilding();
  if (!building) return renderHome();
  normalizeProjectBuilding(building);
  const allBuildingRooms = projectRoomsForBuilding(building.id);
  const locations = building.areas.filter((area) => allBuildingRooms.some((room) => room.areaId === area.id));
  const floors = [...new Set(allBuildingRooms.map((room) => room.floor).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (ui.roomLocationFilter !== 'all' && !locations.some((area) => area.id === ui.roomLocationFilter)) ui.roomLocationFilter = 'all';
  if (ui.roomFloorFilter !== 'all' && !floors.includes(ui.roomFloorFilter)) ui.roomFloorFilter = 'all';

  const query = ui.roomSearch.trim().toLowerCase();
  const filtered = allBuildingRooms.filter((room) => {
    const matchesLocation = ui.roomLocationFilter === 'all' || room.areaId === ui.roomLocationFilter;
    const matchesFloor = ui.roomFloorFilter === 'all' || room.floor === ui.roomFloorFilter;
    const matchesStatus = ui.roomFilter === 'all' || room.status === ui.roomFilter;
    const matchesSearch = !query || `${room.number} ${room.name} ${room.location} ${room.floor} ${room.category}`.toLowerCase().includes(query);
    return matchesLocation && matchesFloor && matchesStatus && matchesSearch;
  });

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  ui.roomPage = clamp(ui.roomPage, 1, totalPages);
  const pageRooms = filtered.slice((ui.roomPage - 1) * perPage, ui.roomPage * perPage);
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    let page = index + 1;
    if (totalPages > 5 && ui.roomPage > 3) page = Math.min(totalPages - 4 + index, ui.roomPage - 2 + index);
    return page;
  });
  const activeFilters = roomFilterCount();

  const tableRows = pageRooms.map((room) => `
    <tr data-action="open-room" data-room="${escapeHtml(room.id)}">
      <td class="strong">${escapeHtml(room.number)}</td>
      <td>${escapeHtml(room.name)}</td>
      <td><div class="room-location-cell"><span class="room-category-chip room-category-chip--${escapeHtml(room.category)}">${locationCategoryLabel(room.category)}</span><span>${escapeHtml(room.location)}</span></div></td>
      <td>${escapeHtml(room.floor)}</td>
      <td>${roomStatusMarkup(room)}</td>
      <td><div class="inline-progress">${makeProgress(room.progress, room.progress === 100 ? 'var(--green)' : progressColor(room.progress))}<strong>${room.progress}%</strong></div></td>
      <td class="row-action">${icon('chevron')}</td>
    </tr>`).join('');

  const mobileRows = pageRooms.map((room) => `
    <button class="mobile-row-card" type="button" data-action="open-room" data-room="${escapeHtml(room.id)}" style="text-align:left">
      <div class="mobile-row-card__head"><div><strong>Room ${escapeHtml(room.number)}</strong><div class="small muted" style="margin-top:4px">${escapeHtml(room.name)}</div></div>${roomStatusMarkup(room)}</div>
      <div class="mobile-row-card__body"><div><div class="mobile-row-card__label">Location</div><div class="mobile-row-card__value">${locationCategoryLabel(room.category)} · ${escapeHtml(room.location)}</div></div><div><div class="mobile-row-card__label">Floor</div><div class="mobile-row-card__value">${escapeHtml(room.floor)}</div></div></div>
      <div class="mobile-row-card__foot"><div style="flex:1">${makeProgress(room.progress)}</div><strong>${room.progress}%</strong>${icon('chevron')}</div>
    </button>`).join('');

  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Rooms', back: '#home' })}
      <main class="page">
        ${renderProjectStrip()}
        <div class="content">
          <section class="section">
            <div class="section-head"><div><h2>${filtered.length} Room${filtered.length === 1 ? '' : 's'}</h2><div class="small muted">${allBuildingRooms.length} total in ${escapeHtml(building.name)}</div></div><button class="button button--primary" type="button" data-action="open-add-room" data-building="${escapeHtml(building.id)}" data-category="interior">${icon('plus')}Add Room</button></div>
            <div class="toolbar room-toolbar">
              <div class="toolbar__group room-search-group"><input class="input" type="search" placeholder="Search rooms" value="${escapeHtml(ui.roomSearch)}" data-control="room-search" aria-label="Search rooms" /></div>
              <button class="button button--secondary room-filter-button ${activeFilters ? 'is-active' : ''}" type="button" data-action="toggle-room-filters">${icon('filter')}Filter${activeFilters ? ` <span class="count-pill">${activeFilters}</span>` : ''}</button>
            </div>
            ${ui.roomFilterPanelOpen ? `<div class="room-filter-panel">
              <label class="field"><span>Location</span><select class="select" data-control="room-location-filter-v2"><option value="all">All Locations</option>${locations.map((area) => `<option value="${escapeHtml(area.id)}" ${ui.roomLocationFilter === area.id ? 'selected' : ''}>${locationCategoryLabel(area.category)} — ${escapeHtml(area.name)}</option>`).join('')}</select></label>
              <label class="field"><span>Floor / Level</span><select class="select" data-control="room-floor-filter-v2"><option value="all">All Floors</option>${floors.map((floor) => `<option value="${escapeHtml(floor)}" ${ui.roomFloorFilter === floor ? 'selected' : ''}>${escapeHtml(floor)}</option>`).join('')}</select></label>
              <label class="field"><span>Status</span><select class="select" data-control="room-status-filter-v2"><option value="all" ${ui.roomFilter === 'all' ? 'selected' : ''}>All Statuses</option><option value="complete" ${ui.roomFilter === 'complete' ? 'selected' : ''}>Complete</option><option value="incomplete" ${ui.roomFilter === 'incomplete' ? 'selected' : ''}>Incomplete</option><option value="not-started" ${ui.roomFilter === 'not-started' ? 'selected' : ''}>Not Started</option></select></label>
              <button class="button button--ghost" type="button" data-action="reset-room-filters">Reset Filters</button>
            </div>` : ''}
          </section>
          <div class="table-wrap table-wrap--responsive"><table class="data-table"><thead><tr><th>Room #</th><th>Room Name</th><th>Location</th><th>Floor</th><th>Status</th><th>Progress</th><th></th></tr></thead><tbody>${tableRows || `<tr><td colspan="7"><div class="empty-state">No rooms match these filters.</div></td></tr>`}</tbody></table></div>
          <div class="mobile-card-list">${mobileRows || `<div class="empty-state">No rooms match these filters.</div>`}</div>
          ${filtered.length ? `<nav class="pagination" aria-label="Room pages"><button class="page-button" type="button" data-action="room-page" data-page="${ui.roomPage - 1}" ${ui.roomPage === 1 ? 'disabled' : ''}>${icon('back')}</button>${pages.map((page) => `<button class="page-button ${ui.roomPage === page ? 'is-active' : ''}" type="button" data-action="room-page" data-page="${page}">${page}</button>`).join('')}<button class="page-button" type="button" data-action="room-page" data-page="${ui.roomPage + 1}" ${ui.roomPage === totalPages ? 'disabled' : ''}>${icon('chevron')}</button></nav>` : ''}
        </div>
      </main>
      ${renderBottomNav('home')}
      ${renderDrawer('rooms')}
    </div>`;
};

renderTaskLocationSelector = function renderTaskLocationSelectorForBuilding() {
  const building = selectedBuilding();
  let rooms = projectRoomsForBuilding(building.id);
  if (!rooms.length) rooms = data.rooms;
  if (!rooms.some((room) => room.id === ui.selectedRoomId) && rooms[0]) ui.selectedRoomId = rooms[0].id;
  const room = selectedRoom();
  return `
    <section class="task-context" aria-label="Task location selection">
      <div class="task-context__heading"><div class="task-context__eyebrow">Working location</div><div class="task-context__summary">${escapeHtml(room.floor || room.level)} · ${locationCategoryLabel(room.category)} · ${escapeHtml(room.location)}</div></div>
      <div class="task-context__controls">
        <label class="task-context__field"><span>Building</span><select class="task-context__select" data-control="task-building-selector" aria-label="Select building">${data.buildings.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === building.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
        <label class="task-context__field task-context__field--room"><span>Room</span><select class="task-context__select" data-control="task-room-selector" aria-label="Select room">${rooms.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === room.id ? 'selected' : ''}>${locationCategoryLabel(item.category)} · ${escapeHtml(item.floor)} · Room ${escapeHtml(item.number)} — ${escapeHtml(item.name)}</option>`).join('')}</select></label>
      </div>
    </section>`;
};
