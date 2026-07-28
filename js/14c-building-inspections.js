'use strict';

/* Inspections can be selected and recorded by building, then by room. */

const buildingInspectionRenderModalBase = renderModal;

function currentInspectionRoom() {
  const building = scopedBuilding();
  if (!building) return null;
  return ensureInspectionRoomForBuilding(building.id);
}

function inspectionTradesForCurrentScope() {
  return [...new Set(inspectionsForScope().map((item) => item.trade))].sort((a, b) => a.localeCompare(b));
}

function ensureInspectionTradeForCurrentScope() {
  const trades = inspectionTradesForCurrentScope();
  if (!trades.includes(ui.inspectionTrade)) ui.inspectionTrade = trades[0] || 'Electrical';
  return ui.inspectionTrade;
}

function renderInspectionScopeCard() {
  const building = scopedBuilding();
  if (!building) return '';
  const rooms = inspectionRoomsForBuilding(building.id);
  const room = currentInspectionRoom();
  return `
    <section class="record-scope-card inspection-scope-card section">
      <img class="record-scope-card__image" src="${escapeHtml(building.image)}" alt="" />
      <div class="record-scope-card__copy"><strong>Inspection Location</strong><span>Select the building first, then the room.</span></div>
      <div class="record-scope-card__controls">
        ${renderBuildingScopeSelect('inspection-building-scope', 'Building')}
        <label class="record-scope-field">
          <span>Room / Work Area</span>
          <select class="record-scope-select" data-control="inspection-room-scope" aria-label="Inspection room" ${rooms.length ? '' : 'disabled'}>
            ${rooms.length ? rooms.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === room?.id ? 'selected' : ''}>${locationCategoryLabel(item.category)} - ${escapeHtml(item.floor || item.level)} - ${escapeHtml(item.number)} ${escapeHtml(item.name)}</option>`).join('') : '<option>No rooms in this building</option>'}
          </select>
          <small>${rooms.length ? 'Inspection results below are limited to this building and room.' : 'Add a room or exterior work area before creating an inspection.'}</small>
        </label>
      </div>
    </section>`;
}

renderInspectionSummary = function renderBuildingInspectionSummary() {
  const building = scopedBuilding();
  if (!building) return renderHome();
  const room = currentInspectionRoom();
  const totals = inspectionCounts();
  const trades = inspectionTradesForCurrentScope();
  const addDisabled = room ? '' : 'disabled';
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Inspections' })}
      <main class="page">
        <div class="content">
          ${renderInspectionScopeCard()}
          <section class="inspection-heading-row section"><div><h2>${escapeHtml(building.name)}</h2><p class="muted small no-margin">${room ? `Room ${escapeHtml(room.number)} - ${escapeHtml(room.name)}` : 'No room selected'}</p></div><button class="button button--primary" type="button" data-action="open-add-inspection" ${addDisabled}>${icon('plus')}Add Inspection</button></section>
          <section class="inspection-totals section">
            <div class="inspection-total"><span class="stat-card__icon icon-green">${icon('check')}</span><div><div class="stat-card__value">${totals.passed}</div><div class="stat-card__label">Passed</div></div></div>
            <div class="inspection-total"><span class="stat-card__icon icon-red">${icon('x')}</span><div><div class="stat-card__value">${totals.failed}</div><div class="stat-card__label">Failed</div></div></div>
            <div class="inspection-total"><span class="stat-card__icon icon-navy">${icon('minus')}</span><div><div class="stat-card__value">${totals.pending}</div><div class="stat-card__label">Not Inspected</div></div></div>
          </section>
          <div class="table-wrap table-wrap--responsive">
            <table class="data-table"><thead><tr><th>Trade</th><th>Passed</th><th>Failed</th><th>Not Inspected</th><th></th></tr></thead><tbody>
              ${trades.map((trade) => {
                const counts = inspectionCounts(trade);
                return `<tr data-action="open-inspection-trade" data-trade="${escapeHtml(trade)}"><td><div class="trade-cell">${tradeIcon(trade)}<strong>${escapeHtml(trade)}</strong></div></td><td><span class="text-green strong">${counts.passed}</span></td><td><span class="text-red strong">${counts.failed}</span></td><td><span class="strong">${counts.pending}</span></td><td>${icon('chevron')}</td></tr>`;
              }).join('') || '<tr><td colspan="5"><div class="empty-state"><strong>No inspections for this building and room.</strong><p class="muted small no-margin">Use Add Inspection to create the first record.</p></div></td></tr>'}
            </tbody></table>
          </div>
          <div class="mobile-card-list">
            ${trades.map((trade) => {
              const counts = inspectionCounts(trade);
              return `<button class="mobile-row-card inspection-trade-card" type="button" data-action="open-inspection-trade" data-trade="${escapeHtml(trade)}" style="text-align:left"><div class="mobile-row-card__head"><div class="trade-cell">${tradeIcon(trade)}<strong>${escapeHtml(trade)}</strong></div>${icon('chevron')}</div><div class="mobile-row-card__foot inspection-trade-counts"><span class="text-green strong">${counts.passed} passed</span><span class="text-red strong">${counts.failed} failed</span><span class="strong">${counts.pending} pending</span></div></button>`;
            }).join('') || `<div class="empty-state"><strong>No inspections for this location.</strong><p class="muted small no-margin">Select another building or room, or add an inspection.</p></div>`}
          </div>
        </div>
      </main>
      ${renderBottomNav('inspections')}
      ${renderDrawer('inspections')}
    </div>`;
};

renderInspectionDetail = function renderBuildingInspectionDetail() {
  const building = scopedBuilding();
  if (!building) return renderHome();
  const room = currentInspectionRoom();
  const trade = ensureInspectionTradeForCurrentScope();
  const trades = inspectionTradesForCurrentScope();
  const list = inspectionsForScope({ trade });
  const counts = inspectionCounts(trade);
  const addDisabled = room ? '' : 'disabled';
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Inspections', back: '#inspections' })}
      <main class="page"><div class="content">
        ${renderInspectionScopeCard()}
        <section class="toolbar inspection-detail-toolbar section">
          <label class="select-wrap"><span class="sr-only">Select trade</span><select data-control="inspection-detail-trade">${(trades.length ? trades : [trade]).map((name) => `<option value="${escapeHtml(name)}" ${name === trade ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label>
          <button class="button button--primary" type="button" data-action="open-add-inspection" ${addDisabled}>${icon('plus')}Add Inspection</button>
        </section>
        <section class="inspection-totals section"><div class="inspection-total"><span class="stat-card__icon icon-green">${icon('check')}</span><div><div class="stat-card__value">${counts.passed}</div><div class="stat-card__label">Passed</div></div></div><div class="inspection-total"><span class="stat-card__icon icon-red">${icon('x')}</span><div><div class="stat-card__value">${counts.failed}</div><div class="stat-card__label">Failed</div></div></div><div class="inspection-total"><span class="stat-card__icon icon-navy">${icon('minus')}</span><div><div class="stat-card__value">${counts.pending}</div><div class="stat-card__label">Not Inspected</div></div></div></section>
        <section class="card inspection-detail-card">
          <div class="inspection-detail-row inspection-detail-row--head"><div>Inspection</div><div>Status</div><div>Assignee</div><div>Scheduled</div><div>Completed</div><div>Result</div><div>Comments</div></div>
          ${list.map((item) => {
            const comments = inspectionCommentHistory(item);
            const latest = comments[comments.length - 1];
            const imageCount = comments.reduce((sum, comment) => sum + normalizeAttachments(comment.attachments).length, 0);
            return `<div><div class="inspection-detail-row"><div><div class="inspection-detail-row__title">${escapeHtml(item.title)}</div><div class="tiny muted" style="margin-top:4px">${escapeHtml(item.description)}</div></div><div>${inspectionStatusMarkup(item.status)}</div><div>${escapeHtml(item.assignee)}</div><div>${formatDate(item.scheduled)}</div><div>${formatDate(item.completed)}</div><div>${inspectionStatusSelect(item)}</div><div><button class="task-comment-button task-comment-button--compact" type="button" data-action="inspection-comment" data-inspection="${escapeHtml(item.id)}" aria-label="Open inspection comments">${icon('comment')}<span class="task-comment-count">${comments.length}</span></button></div></div>${latest ? `<div class="inspection-comment inspection-comment--history"><strong>${comments.length} documented comment${comments.length === 1 ? '' : 's'}${imageCount ? ` - ${imageCount} image${imageCount === 1 ? '' : 's'}` : ''}</strong>${latest.body ? `<br>${escapeHtml(latest.body)}` : ''}<br><span class="tiny">Latest by ${escapeHtml(latest.author)} on ${formatCommentTime(latest.createdAt)}</span></div>` : ''}</div>`;
          }).join('') || `<div class="empty-state"><strong>No ${escapeHtml(trade)} inspections for this building and room.</strong></div>`}
        </section>
      </div></main>
      ${renderBottomNav('inspections')}${renderDrawer('inspections')}
    </div>`;
};

function renderBuildingScopedInspectionModal() {
  const building = scopedBuilding();
  const room = currentInspectionRoom();
  if (!building || !room) {
    return modalShell('Add Inspection', `<div class="empty-state"><strong>A room or exterior work area is required.</strong><p class="muted small no-margin">Close this window, add a location record to the building, then try again.</p></div>`, `<button class="button button--primary" type="button" data-action="close-modal">Close</button>`);
  }
  const tradeOptions = [...new Set([...TRADE_META.map((item) => item.name), ...data.inspections.map((item) => item.trade)])];
  return modalShell('Add Inspection', `
    <form id="add-inspection-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <input type="hidden" name="roomId" value="${escapeHtml(room.id)}" />
      <div class="field field--full record-form-context"><span>${icon('building')}</span><div><strong>${escapeHtml(building.name)}</strong><small>${locationCategoryLabel(room.category)} - ${escapeHtml(room.floor || room.level)} - Room ${escapeHtml(room.number)} ${escapeHtml(room.name)}</small></div></div>
      <div class="field field--full"><label for="inspection-title">Inspection</label><input class="input" id="inspection-title" name="title" required placeholder="Example: Final ceiling inspection" /></div>
      <div class="field field--full"><label for="inspection-description">Acceptance criteria</label><textarea class="textarea" id="inspection-description" name="description" required placeholder="What should the inspector verify?"></textarea></div>
      <div class="field"><label for="inspection-trade">Trade</label><select class="select" id="inspection-trade" name="trade">${tradeOptions.map((trade) => `<option value="${escapeHtml(trade)}" ${trade === ui.inspectionTrade ? 'selected' : ''}>${escapeHtml(trade)}</option>`).join('')}</select></div>
      <div class="field"><label for="inspection-assignee">Assignee</label><input class="input" id="inspection-assignee" name="assignee" required value="M. Turner" /></div>
      <div class="field"><label for="inspection-scheduled">Scheduled</label><input class="input" id="inspection-scheduled" name="scheduled" type="date" required value="${dateOffset(3)}" /></div>
      <div class="field"><label for="inspection-result">Initial result</label><select class="select" id="inspection-result" name="status"><option value="not-inspected">Not Inspected</option><option value="passed">Passed</option><option value="failed">Failed</option></select></div>
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-inspection-form">Add Inspection</button>`);
}

renderModal = function renderModalWithBuildingInspections() {
  if (ui.modal?.type === 'add-inspection') return renderBuildingScopedInspectionModal();
  return buildingInspectionRenderModalBase();
};

function addBuildingScopedInspection(formData) {
  const buildingId = String(formData.get('buildingId') || '');
  const roomId = String(formData.get('roomId') || '');
  const building = data.buildings.find((candidate) => candidate.id === buildingId);
  const room = data.rooms.find((candidate) => candidate.id === roomId && candidate.buildingId === buildingId);
  if (!building || !room) {
    toast('Choose a valid building and room before adding the inspection.');
    return;
  }
  const status = String(formData.get('status'));
  const item = {
    id: nextId('i'),
    buildingId,
    roomId,
    trade: String(formData.get('trade')),
    title: String(formData.get('title')).trim(),
    description: String(formData.get('description')).trim(),
    status,
    assignee: String(formData.get('assignee')).trim(),
    scheduled: String(formData.get('scheduled')),
    completed: status === 'not-inspected' ? null : dateOffset(0),
    comment: status === 'failed' ? 'Correction required. Add inspection details.' : '',
    commentHistory: []
  };
  if (item.comment) {
    item.commentHistory.push({ id: nextId('ic'), author: item.assignee, body: item.comment, createdAt: new Date().toISOString(), attachments: [] });
  }
  data.inspections.push(item);
  ui.selectedBuildingId = buildingId;
  ui.selectedRoomId = roomId;
  ui.inspectionTrade = item.trade;
  addActivity(status, `${item.trade} - ${item.title} added to ${building.name}, Room ${room.number}`);
  saveData();
  ui.modal = null;
  go(`#inspections/${encodeURIComponent(item.trade)}`);
  toast(`Inspection added to ${building.name}.`);
}

function changeInspectionBuilding(buildingId) {
  if (!recordScopeBuildingExists(data, buildingId)) return;
  ui.selectedBuildingId = buildingId;
  ensureInspectionRoomForBuilding(buildingId);
  ensureInspectionTradeForCurrentScope();
  if ((location.hash || '').startsWith('#inspections/')) {
    go('#inspections');
  } else {
    render();
  }
  toast(`Inspection building changed to ${scopedBuilding()?.name || 'the selected building'}.`);
}

document.addEventListener('change', (event) => {
  const control = event.target.dataset.control;
  if (control === 'inspection-building-scope') {
    event.preventDefault();
    event.stopImmediatePropagation();
    changeInspectionBuilding(event.target.value);
  } else if (control === 'inspection-room-scope') {
    event.preventDefault();
    event.stopImmediatePropagation();
    ui.selectedRoomId = event.target.value;
    ensureInspectionTradeForCurrentScope();
    if ((location.hash || '').startsWith('#inspections/')) go('#inspections');
    else render();
  }
}, true);

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'add-inspection-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  addBuildingScopedInspection(new FormData(event.target));
}, true);

if (route().view === 'inspections') render();
