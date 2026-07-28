'use strict';

/* Mobile-first room list and trade-based room overview metrics. */

function roomSectionLabel(category) {
  return category === 'exterior' ? 'Exterior' : 'Interior';
}

function roomSectionNoun(category, count = 2) {
  if (category === 'exterior') return count === 1 ? 'Work Area' : 'Work Areas';
  return count === 1 ? 'Room' : 'Rooms';
}

function roomCategoryTab(building, category) {
  const active = roomCategoryForBuilding(building.id) === category;
  const count = projectRoomsForBuilding(building.id, category).length;
  return `<button class="room-category-tab room-category-tab--${category} ${active ? 'is-active' : ''}" type="button" data-action="room-category-select" data-category="${category}" role="tab" aria-selected="${active}"><span>${roomSectionLabel(category)}</span><small>${count} ${roomSectionNoun(category, count).toLowerCase()}</small></button>`;
}

renderRooms = function renderMobileCategoryRoomList() {
  const building = selectedBuilding();
  if (!building) return renderHome();
  normalizeProjectBuilding(building);
  const category = roomCategoryForBuilding(building.id);
  ui.roomCategoryFilter = category;
  setBuildingAreaTab(building.id, category);

  const categoryRooms = projectRoomsForBuilding(building.id, category);
  const locations = building.areas.filter((area) => area.category === category);
  const floors = [...new Set(categoryRooms.map((room) => room.floor).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (ui.roomLocationFilter !== 'all' && !locations.some((area) => area.id === ui.roomLocationFilter)) ui.roomLocationFilter = 'all';
  if (ui.roomFloorFilter !== 'all' && !floors.includes(ui.roomFloorFilter)) ui.roomFloorFilter = 'all';

  const query = ui.roomSearch.trim().toLowerCase();
  const filtered = categoryRooms.filter((room) => {
    const matchesLocation = ui.roomLocationFilter === 'all' || room.areaId === ui.roomLocationFilter;
    const matchesFloor = ui.roomFloorFilter === 'all' || room.floor === ui.roomFloorFilter;
    const matchesStatus = ui.roomFilter === 'all' || room.status === ui.roomFilter;
    const matchesSearch = !query || `${room.number} ${room.name} ${room.location} ${room.floor}`.toLowerCase().includes(query);
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
  const sectionLabel = roomSectionLabel(category);
  const sectionNoun = roomSectionNoun(category, filtered.length);

  const tableRows = pageRooms.map((room) => `
    <tr data-action="open-room" data-room="${escapeHtml(room.id)}">
      <td class="strong">${escapeHtml(room.number)}</td>
      <td>${escapeHtml(room.name)}</td>
      <td>${escapeHtml(room.location)}</td>
      <td>${escapeHtml(room.floor)}</td>
      <td>${roomStatusMarkup(room)}</td>
      <td><div class="inline-progress">${makeProgress(room.progress, room.progress === 100 ? 'var(--green)' : progressColor(room.progress))}<strong>${room.progress}%</strong></div></td>
      <td class="row-action">${icon('chevron')}</td>
    </tr>`).join('');

  const mobileRows = pageRooms.map((room) => `
    <button class="mobile-row-card mobile-room-card" type="button" data-action="open-room" data-room="${escapeHtml(room.id)}" style="text-align:left">
      <div class="mobile-row-card__head"><div><strong>${category === 'exterior' ? 'Area' : 'Room'} ${escapeHtml(room.number)}</strong><div class="small muted mobile-room-card__name">${escapeHtml(room.name)}</div></div>${roomStatusMarkup(room)}</div>
      <div class="mobile-room-card__location">${icon(category === 'exterior' ? 'building' : 'room')}<span><small>Wing / Location</small><strong>${escapeHtml(room.location)}</strong></span></div>
      <div class="mobile-row-card__foot"><span class="small muted">${escapeHtml(room.floor)}</span><div class="mobile-room-card__progress">${makeProgress(room.progress)}<strong>${room.progress}%</strong></div>${icon('chevron')}</div>
    </button>`).join('');

  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Rooms', back: '#home' })}
      <main class="page">
        ${renderProjectStrip()}
        <div class="content room-page-mobile">
          <section class="room-category-switch" role="tablist" aria-label="Interior and Exterior room lists">
            ${roomCategoryTab(building, 'interior')}
            ${roomCategoryTab(building, 'exterior')}
          </section>

          <section class="section room-list-section">
            <div class="section-head room-list-heading">
              <div><h2>${filtered.length} ${escapeHtml(sectionLabel)} ${escapeHtml(sectionNoun)}</h2><div class="small muted">${categoryRooms.length} total in this section</div></div>
              <button class="button button--primary room-add-button" type="button" data-action="open-add-room" data-building="${escapeHtml(building.id)}" data-category="${escapeHtml(category)}">${icon('plus')}<span>${category === 'exterior' ? 'Add Area' : 'Add Room'}</span></button>
            </div>
            <div class="toolbar room-toolbar room-toolbar--mobile-simple">
              <div class="toolbar__group room-search-group"><input class="input" type="search" placeholder="Search ${sectionLabel.toLowerCase()}" value="${escapeHtml(ui.roomSearch)}" data-control="room-search" aria-label="Search ${sectionLabel.toLowerCase()} rooms and locations" /></div>
              <button class="button button--secondary room-filter-button ${activeFilters ? 'is-active' : ''}" type="button" data-action="toggle-room-filters">${icon('filter')}<span>Filter</span>${activeFilters ? ` <span class="count-pill">${activeFilters}</span>` : ''}</button>
            </div>
            ${ui.roomFilterPanelOpen ? `<div class="room-filter-panel room-filter-panel--mobile">
              <div class="room-filter-panel__title"><strong>Filter ${escapeHtml(sectionLabel)}</strong><span class="small muted">Section is selected above</span></div>
              <label class="field"><span>Wing / Location</span><select class="select" data-control="room-location-filter-v2"><option value="all">All ${escapeHtml(sectionLabel)} Locations</option>${locations.map((area) => `<option value="${escapeHtml(area.id)}" ${ui.roomLocationFilter === area.id ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('')}</select></label>
              <label class="field"><span>Floor / Level</span><select class="select" data-control="room-floor-filter-v2"><option value="all">All Floors</option>${floors.map((floor) => `<option value="${escapeHtml(floor)}" ${ui.roomFloorFilter === floor ? 'selected' : ''}>${escapeHtml(floor)}</option>`).join('')}</select></label>
              <label class="field"><span>Status</span><select class="select" data-control="room-status-filter-v2"><option value="all" ${ui.roomFilter === 'all' ? 'selected' : ''}>All Statuses</option><option value="complete" ${ui.roomFilter === 'complete' ? 'selected' : ''}>Complete</option><option value="incomplete" ${ui.roomFilter === 'incomplete' ? 'selected' : ''}>Incomplete</option><option value="not-started" ${ui.roomFilter === 'not-started' ? 'selected' : ''}>Not Started</option></select></label>
              <button class="button button--ghost room-filter-reset" type="button" data-action="reset-room-filters">Reset Filters</button>
            </div>` : ''}
          </section>

          <div class="table-wrap table-wrap--responsive"><table class="data-table"><thead><tr><th>${category === 'exterior' ? 'Area #' : 'Room #'}</th><th>Name</th><th>Wing / Location</th><th>Floor</th><th>Status</th><th>Progress</th><th></th></tr></thead><tbody>${tableRows || `<tr><td colspan="7"><div class="empty-state">No ${sectionLabel.toLowerCase()} ${roomSectionNoun(category).toLowerCase()} match these filters.</div></td></tr>`}</tbody></table></div>
          <div class="mobile-card-list">${mobileRows || `<div class="empty-state"><div class="empty-state__icon">${icon(category === 'exterior' ? 'building' : 'room')}</div><strong>No ${sectionLabel.toLowerCase()} ${roomSectionNoun(category).toLowerCase()} found.</strong><p class="muted small no-margin">Change the filters or add one to this section.</p></div>`}</div>
          ${filtered.length ? `<nav class="pagination" aria-label="Room pages"><button class="page-button" type="button" data-action="room-page" data-page="${ui.roomPage - 1}" ${ui.roomPage === 1 ? 'disabled' : ''}>${icon('back')}</button>${pages.map((page) => `<button class="page-button ${ui.roomPage === page ? 'is-active' : ''}" type="button" data-action="room-page" data-page="${page}">${page}</button>`).join('')}<button class="page-button" type="button" data-action="room-page" data-page="${ui.roomPage + 1}" ${ui.roomPage === totalPages ? 'disabled' : ''}>${icon('chevron')}</button></nav>` : ''}
        </div>
      </main>
      ${renderBottomNav('home')}
      ${renderDrawer('rooms')}
    </div>`;
};

renderRoomOverviewPanels = function renderRoomOverviewWithTradeMetrics(room) {
  const trades = TRADE_META.map((trade) => collaborationTradeSummary(trade.name, room.id, 'turner'));
  const complete = trades.filter((trade) => trade.status === 'complete').length;
  const incomplete = trades.filter((trade) => trade.status === 'in-progress').length;
  const notStarted = trades.filter((trade) => trade.status === 'not-started').length;
  const progress = trades.length ? Math.round((complete / trades.length) * 100) : 0;
  const clashes = roomTaskClashes(room.id).length;
  return `
    <section class="room-summary section">
      <div class="card room-identity">
        <div class="room-icon">${icon(room.category === 'exterior' ? 'building' : 'room')}</div>
        <div><h1>${room.category === 'exterior' ? 'Area' : 'Room'} ${escapeHtml(room.number)}</h1><p class="no-margin">${escapeHtml(room.name)}</p><p class="muted small no-margin">${escapeHtml(room.location)} · ${escapeHtml(room.floor || room.level)}</p></div>
      </div>
      <div class="card room-due"><div><div class="small">Due: <strong class="text-red">${formatDate(selectedBuilding().dueDate)}</strong></div><div class="small muted" style="margin-top:6px">${dueLabel(selectedBuilding().dueDate)}</div></div></div>
    </section>

    <section class="metric-strip section trade-metric-strip">
      ${renderMetric('icon-green', 'check', complete, 'Complete')}
      ${renderMetric('icon-red', 'x', incomplete, 'Incomplete')}
      ${renderMetric('icon-navy', 'minus', notStarted, 'Not Started')}
      ${renderMetric('icon-navy', 'calendar', trades.length, 'Total Trades')}
      ${renderMetric('icon-orange', 'bolt', clashes, 'Clashes', 'open-clashes')}
    </section>

    <section class="card progress-panel section">
      <div class="progress-heading"><h2>Overall Trade Progress</h2><strong>${progress}% Complete</strong></div>
      ${makeProgress(progress, progressColor(progress))}
      <p class="muted small" style="margin:10px 0 0">${complete} of ${trades.length} trades confirmed complete by Turner</p>
    </section>

    <section class="card progress-panel section">
      <div class="section-head"><h2>Progress by Trade</h2><button class="button button--ghost button--small" type="button" data-action="open-trade-view" data-room="${escapeHtml(room.id)}">Open Trade View</button></div>
      <div class="trade-progress-list">${trades.map((trade) => `
        <div class="trade-progress-row">
          <div class="trade-progress-row__name">${tradeIcon(trade.name)}<span>${escapeHtml(trade.name)}</span></div>
          ${makeProgress(trade.percent, trade.status === 'complete' ? 'var(--green)' : trade.status === 'in-progress' ? 'var(--orange)' : '#dfe4ee')}
          <strong>${trade.percent}%</strong>
        </div>`).join('')}</div>
    </section>

    <section class="card progress-panel section">
      <div class="section-head"><h2>Recent Activity</h2><button class="button button--ghost button--small" type="button" data-action="open-notifications">View All</button></div>
      <div class="activity-list">${data.activity.slice(0, 4).map(renderActivityItem).join('')}</div>
    </section>`;
};

if (['rooms', 'room'].includes(route().view)) render();
