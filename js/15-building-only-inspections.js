'use strict';

/* Inspections are building-wide records and are never assigned to a room. */

const buildingOnlyInspectionBuildDemoDataBase = buildDemoData;

function normalizeBuildingOnlyInspections(target) {
  const fallbackBuildingId = recordScopeDefaultBuildingId(target);
  (target.inspections || []).forEach((inspection) => {
    const previousRoom = (target.rooms || []).find((room) => room.id === inspection.roomId);
    const safeBuildingId = recordScopeBuildingExists(target, inspection.buildingId)
      ? inspection.buildingId
      : (previousRoom?.buildingId || fallbackBuildingId);
    inspection.buildingId = safeBuildingId;
    if ('roomId' in inspection) delete inspection.roomId;
  });
  return target;
}

buildDemoData = function buildDemoDataWithBuildingOnlyInspections() {
  return normalizeBuildingOnlyInspections(buildingOnlyInspectionBuildDemoDataBase());
};

normalizeBuildingOnlyInspections(data);
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not save the building-only inspection migration.', error);
}

inspectionsForScope = function inspectionsForBuildingScope({
  buildingId = scopedBuilding()?.id,
  trade = null
} = {}) {
  return data.inspections.filter((inspection) => {
    const matchesBuilding = inspection.buildingId === buildingId;
    const matchesTrade = !trade || inspection.trade === trade;
    return matchesBuilding && matchesTrade;
  });
};

inspectionCounts = function inspectionCountsForBuilding(trade = null) {
  const list = inspectionsForScope({ trade });
  return {
    passed: list.filter((item) => item.status === 'passed').length,
    failed: list.filter((item) => item.status === 'failed').length,
    pending: list.filter((item) => item.status === 'not-inspected').length,
    total: list.length
  };
};

function renderBuildingOnlyInspectionScopeCard() {
  const building = scopedBuilding();
  if (!building) return '';
  const count = inspectionsForScope({ buildingId: building.id }).length;
  return `
    <section class="record-scope-card record-scope-card--building-only section">
      <div class="record-scope-card__icon">${icon('building')}</div>
      <div class="record-scope-card__copy"><strong>Building Inspections</strong><span>${count} inspection record${count === 1 ? '' : 's'} for the selected building</span></div>
      ${renderBuildingScopeSelect('inspection-building-scope', 'Building', 'Inspections are building-wide and are not assigned to an individual room.')}
    </section>`;
}

renderInspectionScopeCard = renderBuildingOnlyInspectionScopeCard;

renderInspectionSummary = function renderBuildingOnlyInspectionSummary() {
  const building = scopedBuilding();
  if (!building) return renderHome();
  const totals = inspectionCounts();
  const trades = inspectionTradesForCurrentScope();
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Inspections' })}
      <main class="page">
        <div class="content">
          ${renderBuildingOnlyInspectionScopeCard()}
          <section class="inspection-heading-row section">
            <div><h2>${escapeHtml(building.name)}</h2><p class="muted small no-margin">Building-wide inspection records</p></div>
            <button class="button button--primary" type="button" data-action="open-add-inspection">${icon('plus')}Add Inspection</button>
          </section>
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
              }).join('') || '<tr><td colspan="5"><div class="empty-state"><strong>No inspections for this building.</strong><p class="muted small no-margin">Use Add Inspection to create the first building-wide record.</p></div></td></tr>'}
            </tbody></table>
          </div>
          <div class="mobile-card-list">
            ${trades.map((trade) => {
              const counts = inspectionCounts(trade);
              return `<button class="mobile-row-card inspection-trade-card" type="button" data-action="open-inspection-trade" data-trade="${escapeHtml(trade)}" style="text-align:left"><div class="mobile-row-card__head"><div class="trade-cell">${tradeIcon(trade)}<strong>${escapeHtml(trade)}</strong></div>${icon('chevron')}</div><div class="mobile-row-card__foot inspection-trade-counts"><span class="text-green strong">${counts.passed} passed</span><span class="text-red strong">${counts.failed} failed</span><span class="strong">${counts.pending} pending</span></div></button>`;
            }).join('') || `<div class="empty-state"><strong>No inspections for ${escapeHtml(building.name)}.</strong><p class="muted small no-margin">Add the first building-wide inspection record.</p></div>`}
          </div>
        </div>
      </main>
      ${renderBottomNav('inspections')}
      ${renderDrawer('inspections')}
    </div>`;
};

renderInspectionDetail = function renderBuildingOnlyInspectionDetail() {
  const building = scopedBuilding();
  if (!building) return renderHome();
  const trade = ensureInspectionTradeForCurrentScope();
  const trades = inspectionTradesForCurrentScope();
  const list = inspectionsForScope({ trade });
  const counts = inspectionCounts(trade);
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Inspections', back: '#inspections' })}
      <main class="page"><div class="content">
        ${renderBuildingOnlyInspectionScopeCard()}
        <section class="toolbar inspection-detail-toolbar section">
          <label class="select-wrap"><span class="sr-only">Select trade</span><select data-control="inspection-detail-trade">${(trades.length ? trades : [trade]).map((name) => `<option value="${escapeHtml(name)}" ${name === trade ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label>
          <button class="button button--primary" type="button" data-action="open-add-inspection">${icon('plus')}Add Inspection</button>
        </section>
        <section class="inspection-totals section">
          <div class="inspection-total"><span class="stat-card__icon icon-green">${icon('check')}</span><div><div class="stat-card__value">${counts.passed}</div><div class="stat-card__label">Passed</div></div></div>
          <div class="inspection-total"><span class="stat-card__icon icon-red">${icon('x')}</span><div><div class="stat-card__value">${counts.failed}</div><div class="stat-card__label">Failed</div></div></div>
          <div class="inspection-total"><span class="stat-card__icon icon-navy">${icon('minus')}</span><div><div class="stat-card__value">${counts.pending}</div><div class="stat-card__label">Not Inspected</div></div></div>
        </section>
        <section class="card inspection-detail-card">
          <div class="inspection-detail-row inspection-detail-row--head"><div>Inspection</div><div>Status</div><div>Assignee</div><div>Scheduled</div><div>Completed</div><div>Result</div><div>Comments</div></div>
          ${list.map((item) => {
            const comments = inspectionCommentHistory(item);
            const latest = comments[comments.length - 1];
            const imageCount = comments.reduce((sum, comment) => sum + normalizeAttachments(comment.attachments).length, 0);
            return `<div><div class="inspection-detail-row"><div><div class="inspection-detail-row__title">${escapeHtml(item.title)}</div><div class="tiny muted" style="margin-top:4px">${escapeHtml(item.description)}</div></div><div>${inspectionStatusMarkup(item.status)}</div><div>${escapeHtml(item.assignee)}</div><div>${formatDate(item.scheduled)}</div><div>${formatDate(item.completed)}</div><div>${inspectionStatusSelect(item)}</div><div><button class="task-comment-button task-comment-button--compact" type="button" data-action="inspection-comment" data-inspection="${escapeHtml(item.id)}" aria-label="Open inspection comments">${icon('comment')}<span class="task-comment-count">${comments.length}</span></button></div></div>${latest ? `<div class="inspection-comment inspection-comment--history"><strong>${comments.length} documented comment${comments.length === 1 ? '' : 's'}${imageCount ? ` - ${imageCount} image${imageCount === 1 ? '' : 's'}` : ''}</strong>${latest.body ? `<br>${escapeHtml(latest.body)}` : ''}<br><span class="tiny">Latest by ${escapeHtml(latest.author)} on ${formatCommentTime(latest.createdAt)}</span></div>` : ''}</div>`;
          }).join('') || `<div class="empty-state"><strong>No ${escapeHtml(trade)} inspections for this building.</strong></div>`}
        </section>
      </div></main>
      ${renderBottomNav('inspections')}${renderDrawer('inspections')}
    </div>`;
};

renderBuildingScopedInspectionModal = function renderBuildingOnlyInspectionModal() {
  const building = scopedBuilding();
  if (!building) return '';
  const tradeOptions = [...new Set([...TRADE_META.map((item) => item.name), ...data.inspections.map((item) => item.trade)])];
  return modalShell('Add Building Inspection', `
    <form id="add-inspection-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <div class="field field--full record-form-context"><span>${icon('building')}</span><div><strong>${escapeHtml(building.name)}</strong><small>Building-wide inspection - no room assignment</small></div></div>
      <div class="field field--full"><label for="inspection-title">Inspection</label><input class="input" id="inspection-title" name="title" required placeholder="Example: Building envelope inspection" /></div>
      <div class="field field--full"><label for="inspection-description">Acceptance criteria</label><textarea class="textarea" id="inspection-description" name="description" required placeholder="What should the inspector verify for this building?"></textarea></div>
      <div class="field"><label for="inspection-trade">Trade</label><select class="select" id="inspection-trade" name="trade">${tradeOptions.map((trade) => `<option value="${escapeHtml(trade)}" ${trade === ui.inspectionTrade ? 'selected' : ''}>${escapeHtml(trade)}</option>`).join('')}</select></div>
      <div class="field"><label for="inspection-assignee">Assignee</label><input class="input" id="inspection-assignee" name="assignee" required value="M. Turner" /></div>
      <div class="field"><label for="inspection-scheduled">Scheduled</label><input class="input" id="inspection-scheduled" name="scheduled" type="date" required value="${dateOffset(3)}" /></div>
      <div class="field"><label for="inspection-result">Initial result</label><select class="select" id="inspection-result" name="status"><option value="not-inspected">Not Inspected</option><option value="passed">Passed</option><option value="failed">Failed</option></select></div>
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-inspection-form">Add Inspection</button>`);
};

addBuildingScopedInspection = function addBuildingOnlyInspection(formData) {
  const buildingId = String(formData.get('buildingId') || '');
  const building = data.buildings.find((candidate) => candidate.id === buildingId);
  if (!building) {
    toast('Choose a valid building before adding the inspection.');
    return;
  }
  const status = String(formData.get('status'));
  const item = {
    id: nextId('i'),
    buildingId,
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
  ui.inspectionTrade = item.trade;
  addActivity(status, `${item.trade} - ${item.title} added to ${building.name}`);
  saveData();
  ui.modal = null;
  go(`#inspections/${encodeURIComponent(item.trade)}`);
  toast(`Building-wide inspection added to ${building.name}.`);
};

changeInspectionBuilding = function changeBuildingOnlyInspectionScope(buildingId) {
  if (!recordScopeBuildingExists(data, buildingId)) return;
  ui.selectedBuildingId = buildingId;
  ensureInspectionTradeForCurrentScope();
  if ((location.hash || '').startsWith('#inspections/')) go('#inspections');
  else render();
  toast(`Showing building-wide inspections for ${scopedBuilding()?.name || 'the selected building'}.`);
};

if (route().view === 'inspections') render();
