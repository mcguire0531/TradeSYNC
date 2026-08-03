'use strict';

function renderConstraintImpactBadges(item) {
  normalizeConstraintImpact(item);
  const impact = item.impact;
  const tradeCopy = impact.trades.length ? impact.trades.join(', ') : 'All trades';
  const scopeCopy = impact.scope === 'building' ? 'Building-wide' : impact.scope === 'room' ? 'Specific room/area' : impact.scope === 'location' ? 'Location' : 'Section';
  return `<div class="constraint-impact-badges"><span>${icon('alert')} ${escapeHtml(impact.type)}</span><span>${escapeHtml(scopeCopy)}</span><span>${escapeHtml(tradeCopy)}</span>${impact.delayDays ? `<span>${impact.delayDays} day impact</span>` : ''}${impact.blocksReadiness ? '<span class="constraint-impact-badges__block">Blocks Readiness</span>' : ''}</div>`;
}

renderReferenceConstraintCard = function renderImpactConstraintCard(item) {
  normalizeConstraint(item);
  normalizeConstraintImpact(item);
  const imageCount = item.attachments.length + constraintComments(item).reduce((sum, comment) => sum + normalizeAttachments(comment.attachments).length, 0);
  const active = item.status === 'active';
  return `
    <article class="constraint-reference-card ${active ? '' : 'constraint-reference-card--resolved'}">
      <button class="constraint-reference-card__body" type="button" data-action="open-constraint" data-constraint="${escapeHtml(item.id)}">
        <span class="constraint-reference-card__title-row"><strong>${escapeHtml(item.title)}</strong>${icon('chevron')}</span>
        <span class="constraint-reference-card__badges"><span class="constraint-type-chip">${escapeHtml(item.type)}</span><span aria-hidden="true">•</span><span class="constraint-status-chip ${active ? 'constraint-status-chip--active' : 'constraint-status-chip--resolved'}">${active ? 'Active' : 'Resolved'}</span></span>
        <span class="constraint-reference-card__description">${escapeHtml(item.description)}</span>
        ${renderConstraintImpactBadges(item)}
      </button>
      <div class="constraint-reference-card__footer"><div class="constraint-resolve-by"><span>Resolve By</span><strong>${icon('calendar')} ${formatDate(item.endDate)}</strong></div><div class="constraint-reference-card__actions"><button class="constraint-images-button" type="button" data-action="open-constraint" data-constraint="${escapeHtml(item.id)}"><span>Images${imageCount ? ` ${imageCount}` : ''}</span>${icon('upload')}</button><button class="button button--secondary constraint-resolve-button" type="button" data-action="${active ? 'start-resolve-constraint' : 'reopen-advanced-constraint'}" data-constraint="${escapeHtml(item.id)}">${active ? 'Resolve' : 'Reopen'}</button></div></div>
    </article>`;
};

function renderTradeImpactCheckboxes(selected = []) {
  return `<div class="impact-trade-grid">${TRADE_META.map((trade) => `<label><input type="checkbox" name="affectedTrades" value="${escapeHtml(trade.name)}" ${selected.includes(trade.name) ? 'checked' : ''} /><span>${tradeIcon(trade.name)}${escapeHtml(trade.name)}</span></label>`).join('')}</div>`;
}

renderBuildingScopedConstraintModal = function renderConstraintWithActualImpactModal() {
  const building = scopedBuilding();
  if (!building) return '';
  const locations = building.areas || [];
  const rooms = projectRoomsForBuilding(building.id);
  return modalShell('Add Building Constraint', `
    <form id="add-constraint-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <div class="field field--full record-form-context"><span>${icon('building')}</span><div><strong>${escapeHtml(building.name)}</strong><small>Building-level record with an explicit affected scope</small></div></div>
      <div class="field field--full"><label for="constraint-title">Constraint title</label><input class="input" id="constraint-title" name="title" required placeholder="What is blocking or threatening the work?" /></div>
      <div class="field field--full"><label for="constraint-description">Description</label><textarea class="textarea" id="constraint-description" name="description" required placeholder="Explain the issue, impact, and action needed"></textarea></div>
      <div class="field"><label for="constraint-type">Type</label><select class="select" id="constraint-type" name="type"><option>Schedule</option><option>Resource</option><option>Coordination</option><option>Design</option><option>Material</option><option>Access</option></select></div>
      <div class="field"><label for="constraint-priority">Priority</label><select class="select" id="constraint-priority" name="priority"><option value="critical">Critical Path</option><option value="moderate">Moderate</option><option value="low">Low</option></select></div>
      <div class="field"><label for="constraint-resolve-by">Resolve By</label><input class="input" id="constraint-resolve-by" name="resolveBy" type="date" required value="${dateOffset(7)}" /></div>
      <div class="field"><label for="constraint-owner">Owner</label><input class="input" id="constraint-owner" name="owner" required value="${CURRENT_USER}" /></div>
      <div class="field"><label for="constraint-impact-type">Actual impact</label><select class="select" id="constraint-impact-type" name="impactType"><option>Work Blocked</option><option>Schedule Risk</option><option>Inspection Blocked</option><option>Handoff Blocked</option><option>Turnover Risk</option><option>Quality Risk</option></select></div>
      <div class="field"><label for="constraint-impact-scope">Affected scope</label><select class="select" id="constraint-impact-scope" name="impactScope"><option value="building">Entire Building</option><option value="section">Interior or Exterior Section</option><option value="location">Wing / Location</option><option value="room">Specific Room / Work Area</option></select></div>
      <div class="field"><label for="constraint-impact-category">Section</label><select class="select" id="constraint-impact-category" name="impactCategory"><option value="all">Interior and Exterior</option><option value="interior">Interior Only</option><option value="exterior">Exterior Only</option></select></div>
      <div class="field"><label for="constraint-impact-location">Wing / Location</label><select class="select" id="constraint-impact-location" name="impactAreaId"><option value="">All Locations</option>${locations.map((area) => `<option value="${escapeHtml(area.id)}">${locationCategoryLabel(area.category)} · ${escapeHtml(area.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="constraint-impact-room">Room / Work Area</label><select class="select" id="constraint-impact-room" name="impactRoomId"><option value="">All Rooms / Areas</option>${rooms.map((room) => `<option value="${escapeHtml(room.id)}">${locationCategoryLabel(room.category)} · ${escapeHtml(room.number)} ${escapeHtml(room.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="constraint-delay-days">Estimated delay days</label><input class="input" id="constraint-delay-days" name="delayDays" type="number" min="0" max="365" value="0" /></div>
      <div class="field"><label for="constraint-blocked-stage">Stage affected</label><select class="select" id="constraint-blocked-stage" name="blockedStage"><option value="all">All Readiness Stages</option><option value="next-trade">Next Trade / Handoff</option><option value="inspection">Inspection</option><option value="turnover">Turnover</option></select></div>
      <div class="field field--full"><label class="readiness-checkbox"><input type="checkbox" name="blocksReadiness" value="true" checked /><span><strong>Block readiness while active</strong><small>The room or affected section cannot be marked ready until this constraint is confirmed resolved.</small></span></label></div>
      <div class="field field--full"><label>Affected trades <span class="muted">(leave blank for all)</span></label>${renderTradeImpactCheckboxes()}</div>
      ${renderImageUploadField({ id: 'constraint-images', name: 'constraintImages', label: 'Constraint images', help: 'Optional. Add building photos, drawings, or visual proof of the impact.' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-constraint-form">Add Constraint</button>`);
};

renderConstraintDetailModal = function renderConstraintImpactDetailModal() {
  const item = data.constraints.find((constraint) => constraint.id === ui.modal?.constraintId);
  if (!item) return '';
  normalizeConstraint(item);
  normalizeConstraintImpact(item);
  const building = data.buildings.find((candidate) => candidate.id === item.buildingId) || scopedBuilding();
  const comments = constraintComments(item);
  const impact = item.impact;
  const locationNames = (building?.areas || []).filter((area) => impact.areaIds.includes(area.id)).map((area) => area.name);
  const roomNames = data.rooms.filter((room) => impact.roomIds.includes(room.id)).map((room) => `${room.number} ${room.name}`);
  const body = `
    <div class="constraint-detail-header"><div class="constraint-detail-header__icon ${item.status === 'resolved' ? 'icon-green' : item.priority === 'critical' ? 'icon-red' : item.priority === 'moderate' ? 'icon-orange' : 'icon-blue'}">${item.status === 'resolved' ? icon('check') : icon('clock')}</div><div><div class="constraint-detail-badges"><span class="status-pill ${item.status === 'resolved' ? 'status-pill--resolved' : 'status-pill--complete'}">${item.status === 'resolved' ? 'Resolved' : 'Active'}</span><span class="status-pill ${priorityClass(item.priority)}">${priorityLabel(item.priority)}</span><span class="status-pill status-pill--pending">${escapeHtml(item.type)}</span></div><p class="constraint-detail-description">${escapeHtml(item.description)}</p></div></div>
    <div class="constraint-detail-meta constraint-detail-meta--building"><div><span>Building</span><strong>${escapeHtml(building?.name || 'Unknown Building')}</strong></div><div><span>Owner</span><strong>${escapeHtml(item.owner)}</strong></div><div><span>Resolve By</span><strong>${formatDate(item.endDate)}</strong></div></div>
    <section class="constraint-impact-detail"><div class="documentation-section__head"><h3>Actual Impact</h3>${impact.blocksReadiness ? '<span class="status-pill status-pill--critical">Blocks Readiness</span>' : ''}</div><div class="constraint-impact-detail__grid"><div><span>Impact</span><strong>${escapeHtml(impact.type)}</strong></div><div><span>Stage</span><strong>${escapeHtml(impact.blockedStage)}</strong></div><div><span>Delay</span><strong>${impact.delayDays} day${impact.delayDays === 1 ? '' : 's'}</strong></div><div><span>Section</span><strong>${escapeHtml(impact.category === 'all' ? 'Interior and Exterior' : locationCategoryLabel(impact.category))}</strong></div><div><span>Locations</span><strong>${escapeHtml(locationNames.join(', ') || 'All matching locations')}</strong></div><div><span>Rooms / Areas</span><strong>${escapeHtml(roomNames.join(', ') || 'All matching rooms')}</strong></div><div class="constraint-impact-detail__trades"><span>Trades</span><strong>${escapeHtml(impact.trades.join(', ') || 'All trades')}</strong></div></div></section>
    ${item.status === 'resolved' && item.resolution.note ? `<section class="constraint-resolution-record"><div>${icon('check')}<strong>Resolution Confirmed</strong></div><p>${escapeHtml(item.resolution.note)}</p><span>${escapeHtml(item.resolution.resolvedBy || 'Unknown')} · ${formatCommentTime(item.resolution.resolvedAt)}</span></section>` : ''}
    ${item.attachments.length ? `<section class="documentation-section"><div class="documentation-section__head"><h3>Constraint Images</h3><span class="count-pill">${item.attachments.length}</span></div>${renderAttachmentGallery(item.attachments)}</section>` : ''}
    <section class="documentation-section"><div class="documentation-section__head"><h3>Comments & Documentation</h3><span class="count-pill">${comments.length}</span></div>${renderDocumentationThread(comments, 'No constraint comments yet.', 'Add a coordination note or image to the permanent building record.')}</section>
    <form id="constraint-comment-form" class="task-comment-form form-grid"><input type="hidden" name="constraintId" value="${escapeHtml(item.id)}" /><div class="field field--full"><label for="constraint-comment-body">Add comment</label><textarea class="textarea" id="constraint-comment-body" name="body" placeholder="Add an update, decision, or coordination note"></textarea></div>${renderImageUploadField({ id: 'constraint-comment-images', name: 'constraintCommentImages', label: 'Add images to this comment' })}</form>`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--secondary" type="button" data-action="${item.status === 'resolved' ? 'reopen-advanced-constraint' : 'start-resolve-constraint'}" data-constraint="${escapeHtml(item.id)}">${item.status === 'resolved' ? 'Reopen Constraint' : 'Resolve Constraint'}</button><button class="button button--primary" type="submit" form="constraint-comment-form">${icon('comment')}Add Documentation</button>`;
  return modalShell(item.title, body, footer);
};

function renderResolveConstraintModal() {
  const item = data.constraints.find((constraint) => constraint.id === ui.modal?.constraintId);
  if (!item) return '';
  return modalShell('Confirm Constraint Resolution', `
    <form id="constraint-resolution-form" class="form-grid">
      <input type="hidden" name="constraintId" value="${escapeHtml(item.id)}" />
      <div class="field field--full record-form-context"><span>${icon('check')}</span><div><strong>${escapeHtml(item.title)}</strong><small>Confirm the blocking condition is actually cleared before moving this record to Resolved.</small></div></div>
      <div class="field field--full"><label class="readiness-checkbox"><input type="checkbox" name="confirmed" value="true" required /><span><strong>I verified the impact is cleared</strong><small>Readiness will recalculate after this confirmation.</small></span></label></div>
      <div class="field field--full"><label for="constraint-resolution-note">Resolution note</label><textarea class="textarea" id="constraint-resolution-note" name="note" required placeholder="Describe what changed, who verified it, and any remaining conditions"></textarea></div>
      ${renderImageUploadField({ id: 'constraint-resolution-images', name: 'constraintResolutionImages', label: 'Resolution proof', help: 'Optional. Add photos or marked-up documents showing the condition is resolved.' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="constraint-resolution-form">Confirm Resolved</button>`);
}

function renderInspectionGatePanel() {
  const building = scopedBuilding();
  if (!building) return '';
  const gates = inspectionGatesForBuilding(building.id);
  const passed = gates.filter((item) => item.status === 'passed').length;
  const failed = gates.filter((item) => item.status === 'failed').length;
  const pending = gates.filter((item) => item.status === 'not-inspected').length;
  return `
    <section class="inspection-gate-panel section">
      <div class="section-head"><div><h2>Readiness Gates</h2><p class="muted small no-margin">Required building inspections that control readiness.</p></div><span class="inspection-gate-panel__score">${passed}/${gates.length} passed</span></div>
      <div class="inspection-gate-panel__metrics"><span class="text-green"><strong>${passed}</strong> Passed</span><span class="text-red"><strong>${failed}</strong> Failed</span><span><strong>${pending}</strong> Pending</span></div>
      <div class="inspection-gate-list">${gates.length ? gates.slice(0, 6).map((item) => `<button type="button" data-action="go" data-hash="#inspections/${encodeURIComponent(item.trade)}"><span>${tradeIcon(item.trade)}<strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(READINESS_GATE_STAGES.find((stage) => stage.value === item.gateStage)?.label || 'Turnover')} · ${item.blocksReadiness ? 'Blocks readiness' : 'Advisory'}</small></span>${inspectionStatusMarkup(item.status)}${icon('chevron')}</button>`).join('') : '<div class="empty-state"><strong>No required gates yet.</strong><p class="muted small no-margin">Mark an inspection as a readiness gate when adding it.</p></div>'}</div>
    </section>`;
}

renderInspectionSummary = function renderInspectionSummaryWithGates() {
  const html = readinessUiRenderInspectionSummaryBase();
  return html.replace('<section class="inspection-heading-row section">', `${renderInspectionGatePanel()}<section class="inspection-heading-row section">`);
};

renderInspectionDetail = function renderInspectionDetailWithGates() {
  const html = readinessUiRenderInspectionDetailBase();
  return html.replace('<section class="toolbar inspection-detail-toolbar section">', `${renderInspectionGatePanel()}<section class="toolbar inspection-detail-toolbar section">`);
};

renderBuildingScopedInspectionModal = function renderInspectionWithGateControls() {
  const building = scopedBuilding();
  if (!building) return '';
  const tradeOptions = [...new Set([...TRADE_META.map((item) => item.name), ...data.inspections.map((item) => item.trade)])];
  return modalShell('Add Building Inspection', `
    <form id="add-inspection-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <div class="field field--full record-form-context"><span>${icon('building')}</span><div><strong>${escapeHtml(building.name)}</strong><small>Building-wide inspection · no room assignment</small></div></div>
      <div class="field field--full"><label for="inspection-title">Inspection</label><input class="input" id="inspection-title" name="title" required placeholder="Example: Building envelope inspection" /></div>
      <div class="field field--full"><label for="inspection-description">Acceptance criteria</label><textarea class="textarea" id="inspection-description" name="description" required placeholder="What must be verified before work can advance?"></textarea></div>
      <div class="field"><label for="inspection-trade">Trade</label><select class="select" id="inspection-trade" name="trade">${tradeOptions.map((trade) => `<option value="${escapeHtml(trade)}" ${trade === ui.inspectionTrade ? 'selected' : ''}>${escapeHtml(trade)}</option>`).join('')}</select></div>
      <div class="field"><label for="inspection-assignee">Assignee</label><input class="input" id="inspection-assignee" name="assignee" required value="M. Turner" /></div>
      <div class="field"><label for="inspection-scheduled">Scheduled</label><input class="input" id="inspection-scheduled" name="scheduled" type="date" required value="${dateOffset(3)}" /></div>
      <div class="field"><label for="inspection-result">Initial result</label><select class="select" id="inspection-result" name="status"><option value="not-inspected">Not Inspected</option><option value="passed">Passed</option><option value="failed">Failed</option></select></div>
      <div class="field"><label for="inspection-gate-stage">Readiness stage</label><select class="select" id="inspection-gate-stage" name="gateStage">${READINESS_GATE_STAGES.map((stage) => `<option value="${stage.value}">${escapeHtml(stage.label)}</option>`).join('')}</select></div>
      <div class="field field--full"><label class="readiness-checkbox"><input type="checkbox" name="requiredGate" value="true" /><span><strong>Required readiness gate</strong><small>When enabled, this inspection can block affected rooms from advancing until it passes.</small></span></label></div>
      <div class="field field--full"><label class="readiness-checkbox"><input type="checkbox" name="blocksReadiness" value="true" checked /><span><strong>Failed or pending result blocks readiness</strong><small>Use for required inspections that must pass before the next stage.</small></span></label></div>
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-inspection-form">Add Inspection</button>`);
};
