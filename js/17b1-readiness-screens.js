'use strict';

/* Mobile-first readiness, handoff, inspection-gate, impact, and quick-update UI. */

const readinessUiRenderRoomsBase = renderRooms;
const readinessUiRenderRoomOverviewBase = renderRoomOverviewPanels;
const readinessUiRenderTradeTaskViewBase = renderTradeTaskView;
const readinessUiRenderInspectionSummaryBase = renderInspectionSummary;
const readinessUiRenderInspectionDetailBase = renderInspectionDetail;
const readinessUiRenderModalBase = renderModal;
const readinessUiCommentDraftFormSpecBase = commentDraftFormSpec;
const readinessUiEnhanceCommentDraftFormBase = enhanceCommentDraftForm;

if (!ui.quickUpdateContext || typeof ui.quickUpdateContext !== 'object') ui.quickUpdateContext = {};

function renderReadinessPill(readiness, compact = false) {
  const record = readiness?.state ? readiness : roomReadiness(readiness);
  return `<span class="readiness-pill readiness-pill--${escapeHtml(record.tone)} ${compact ? 'readiness-pill--compact' : ''}"><span class="readiness-pill__dot"></span>${escapeHtml(compact ? record.shortLabel : record.label)}</span>`;
}

function renderReadinessMiniSummary(summary) {
  return `
    <div class="readiness-mini-summary" aria-label="Building readiness">
      <span class="readiness-mini readiness-mini--green"><strong>${summary.ready}</strong> ready</span>
      <span class="readiness-mini readiness-mini--red"><strong>${summary.blocked}</strong> blocked</span>
      <span class="readiness-mini readiness-mini--yellow"><strong>${summary.atRisk}</strong> at risk</span>
    </div>`;
}

function renderPortfolioReadiness() {
  const summary = portfolioReadinessSummary();
  return `
    <section class="portfolio-readiness section" aria-label="Portfolio readiness">
      <div class="section-head portfolio-readiness__head">
        <div><h2>Readiness Overview</h2><p class="muted small no-margin">Live results calculated from verification, constraints, handoffs, and inspection gates.</p></div>
        <button class="button button--primary" type="button" data-action="open-quick-update">${icon('bolt')}Quick Update</button>
      </div>
      <div class="portfolio-readiness__grid">
        <div class="portfolio-readiness__metric portfolio-readiness__metric--ready"><strong>${summary.ready}</strong><span>Turnover Ready</span></div>
        <div class="portfolio-readiness__metric portfolio-readiness__metric--blocked"><strong>${summary.blocked}</strong><span>Blocked</span></div>
        <div class="portfolio-readiness__metric portfolio-readiness__metric--risk"><strong>${summary.atRisk}</strong><span>At Risk</span></div>
        <div class="portfolio-readiness__metric"><strong>${summary.pendingHandoffs}</strong><span>Handoffs</span></div>
      </div>
    </section>`;
}

function renderTurnerActionCenter() {
  const summary = portfolioReadinessSummary();
  const total = summary.verificationClashes + summary.failedGates + summary.pendingHandoffs;
  return `
    <section class="turner-action-center section">
      <div class="turner-action-center__copy">
        <span class="turner-action-center__icon">${icon('check')}</span>
        <div><h2>Turner Action Center</h2><p class="muted small no-margin">One place to verify trade updates, inspection gates, and handoffs.</p></div>
      </div>
      <div class="turner-action-center__counts">
        <span><strong>${summary.verificationClashes}</strong> verifications</span>
        <span><strong>${summary.failedGates}</strong> failed gates</span>
        <span><strong>${summary.pendingHandoffs}</strong> handoffs</span>
      </div>
      <button class="button ${total ? 'button--primary' : 'button--secondary'}" type="button" data-action="open-next-turner-verification">${total ? 'Open Next Action' : 'Review Quick Update'}</button>
    </section>`;
}

renderBuildingCard = function renderBuildingCardWithReadiness(building) {
  normalizeProjectBuilding(building);
  const days = daysFromToday(building.dueDate);
  const counts = buildingLocationCounts(building);
  const readiness = buildingReadinessSummary(building.id);
  return `
    <article class="building-card building-card--with-areas building-card--mobile-flow building-card--readiness">
      <button class="building-card__project" type="button" data-action="select-building" data-building="${escapeHtml(building.id)}" aria-label="Open ${escapeHtml(building.name)} and choose Interior or Exterior">
        <img class="building-card__image" src="${escapeHtml(building.image)}" alt="${escapeHtml(building.name)}" />
        <span class="building-card__content">
          <span class="building-card__title">${escapeHtml(building.name)}</span>
          <span class="small muted">${escapeHtml(building.address)}</span>
          <span class="building-card__meta">${icon('calendar')}<span>Due: <strong class="${days < 0 ? 'text-red' : ''}">${formatDate(building.dueDate)}</strong></span></span>
          <span class="progress-row">${makeProgress(readiness.averageScore)}<span class="progress-number">${readiness.averageScore}%</span></span>
          ${renderReadinessMiniSummary(readiness)}
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

renderHome = function renderHomeWithReadinessAndQuickActions() {
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Home' })}
      <main class="page">
        <div class="content">
          <section class="hero-row hero-row--workflow">
            <div class="welcome-copy"><h1>Welcome, James</h1><p class="muted">Choose a building or use Quick Update in the field.</p></div>
            <div class="hero-row__actions">
              <button class="button button--secondary" type="button" data-action="open-quick-update">${icon('bolt')}Quick Update</button>
              <button class="button button--primary" type="button" data-action="open-add-building">${icon('plus')}Add Building</button>
            </div>
          </section>
          ${renderPortfolioReadiness()}
          ${renderTurnerActionCenter()}
          <section class="section"><div class="section-head"><h2>My Buildings</h2></div><div class="building-list home-buildings">${data.buildings.map(renderBuildingCard).join('')}</div></section>
          <section class="info-banner"><div class="info-banner__illustration">${icon('building')}</div><div><h3>Readiness is based on real records</h3><p class="muted small no-margin">A room cannot become ready while verification clashes, failed gates, rejected handoffs, or blocking constraints remain.</p></div></section>
        </div>
      </main>
      ${renderBottomNav('home')}
      ${renderDrawer('home')}
    </div>`;
};

function renderCategoryReadinessStrip(buildingId, category) {
  const records = projectRoomsForBuilding(buildingId, category).map((room) => roomReadiness(room));
  const count = (state) => records.filter((record) => record.state === state).length;
  return `
    <section class="category-readiness-strip section">
      <div><span class="small muted">Section Readiness</span><strong>${locationCategoryLabel(category)}</strong></div>
      <div class="category-readiness-strip__metrics">
        <span class="text-green"><strong>${count('turnover-ready')}</strong> Ready</span>
        <span class="text-red"><strong>${count('blocked')}</strong> Blocked</span>
        <span class="text-orange"><strong>${count('at-risk') + count('ready-for-inspection') + count('ready-for-handoff')}</strong> Action</span>
      </div>
    </section>`;
}

renderRooms = function renderRoomsWithReadinessSummary() {
  const building = selectedBuilding();
  const category = building ? roomCategoryForBuilding(building.id) : 'interior';
  const html = readinessUiRenderRoomsBase();
  if (!building) return html;
  return html.replace('<section class="section room-list-section">', `${renderCategoryReadinessStrip(building.id, category)}<section class="section room-list-section">`);
};

function renderRoomReadinessPanel(room) {
  const readiness = roomReadiness(room);
  const reasonItems = readiness.reasons.slice(0, 3).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('');
  return `
    <section class="room-readiness-card room-readiness-card--${escapeHtml(readiness.tone)} section">
      <div class="room-readiness-card__top">
        <div class="room-readiness-card__status"><span class="room-readiness-card__icon">${readiness.state === 'turnover-ready' ? icon('check') : readiness.state === 'blocked' ? icon('alert') : icon('clock')}</span><div><span class="small">Room Readiness</span><h2>${escapeHtml(readiness.label)}</h2></div></div>
        <div class="room-readiness-card__score"><strong>${readiness.score}%</strong><span>readiness score</span></div>
      </div>
      ${makeProgress(readiness.score, readiness.state === 'turnover-ready' ? 'var(--green)' : readiness.state === 'blocked' ? 'var(--red)' : readiness.state === 'at-risk' ? 'var(--orange)' : 'var(--blue)')}
      <ul class="room-readiness-card__reasons">${reasonItems}</ul>
      <div class="room-readiness-card__action"><span><strong>Next best action:</strong> ${escapeHtml(readiness.nextAction)}</span><button class="button button--secondary button--small" type="button" data-action="open-readiness-details" data-room="${escapeHtml(room.id)}">View Details</button></div>
    </section>`;
}

function renderRoomHandoffPanel(room) {
  const handoffs = handoffsForRoom(room.id).filter((item) => item.status !== 'cancelled');
  const active = handoffs.filter((item) => item.status === 'requested' || item.status === 'rejected');
  const recent = handoffs.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 4);
  return `
    <section class="card progress-panel section handoff-panel">
      <div class="section-head"><div><h2>Trade Handoffs</h2><p class="muted small no-margin">The next trade accepts the space before starting work.</p></div><button class="button button--ghost button--small" type="button" data-action="open-request-handoff" data-room="${escapeHtml(room.id)}">${icon('plus')}Request</button></div>
      <div class="handoff-summary-row"><span><strong>${active.length}</strong> need action</span><span><strong>${handoffs.filter((item) => item.status === 'accepted').length}</strong> accepted</span></div>
      <div class="handoff-list">${recent.length ? recent.map(renderHandoffCard).join('') : `<div class="empty-state handoff-empty"><strong>No handoffs yet.</strong><p class="muted small no-margin">Complete a trade scope, then request acceptance from the next trade.</p></div>`}</div>
    </section>`;
}

function renderHandoffCard(item) {
  const room = data.rooms.find((candidate) => candidate.id === item.roomId);
  const statusLabel = HANDOFF_STATUS_LABELS[item.status] || item.status;
  return `
    <article class="handoff-card handoff-card--${escapeHtml(item.status)}">
      <div class="handoff-card__route"><span>${tradeIcon(item.fromTrade)}<strong>${escapeHtml(item.fromTrade)}</strong></span>${icon('chevron')}<span>${tradeIcon(item.toTrade)}<strong>${escapeHtml(item.toTrade)}</strong></span></div>
      <div class="handoff-card__meta"><span>${escapeHtml(statusLabel)}</span><span>Due ${formatDate(item.dueDate)}</span>${room ? `<span>${room.category === 'exterior' ? 'Area' : 'Room'} ${escapeHtml(room.number)}</span>` : ''}</div>
      ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}
      <div class="handoff-card__actions">
        ${item.status === 'requested' || item.status === 'rejected' ? `<button class="button button--secondary button--small" type="button" data-action="open-handoff-response" data-handoff="${escapeHtml(item.id)}">Review</button>` : `<button class="button button--ghost button--small" type="button" data-action="open-handoff-response" data-handoff="${escapeHtml(item.id)}">Details</button>`}
      </div>
    </article>`;
}

renderRoomOverviewPanels = function renderRoomOverviewWithReadiness(room) {
  let html = readinessUiRenderRoomOverviewBase(room);
  html = html.replace('<section class="metric-strip section trade-metric-strip">', `${renderRoomReadinessPanel(room)}<section class="metric-strip section trade-metric-strip">`);
  const activityMarker = '<section class="card progress-panel section">\n      <div class="section-head"><h2>Recent Activity</h2>';
  if (html.includes(activityMarker)) html = html.replace(activityMarker, `${renderRoomHandoffPanel(room)}${activityMarker}`);
  else html += renderRoomHandoffPanel(room);
  return html;
};

function renderVerificationCorePanel(room) {
  const tradeRecords = TRADE_META.map((trade) => collaborationTradeSummary(trade.name, room.id, 'trade'));
  const turnerRecords = TRADE_META.map((trade) => collaborationTradeSummary(trade.name, room.id, 'turner'));
  const tradeComplete = tradeRecords.filter((record) => record.status === 'complete').length;
  const turnerComplete = turnerRecords.filter((record) => record.status === 'complete').length;
  const clashes = roomTaskClashes(room.id);
  return `
    <section class="verification-core-panel section">
      <div class="verification-core-panel__head"><div><span class="small muted">Independent Verification</span><h2>Trade and Turner records stay separate</h2></div><button class="button button--primary button--small" type="button" data-action="open-quick-update" data-room="${escapeHtml(room.id)}">${icon('bolt')}Quick Update</button></div>
      <div class="verification-core-panel__grid">
        <div><span>Trade View</span><strong>${tradeComplete} / ${TRADE_META.length}</strong><small>trades complete</small></div>
        <div><span>Turner View</span><strong>${turnerComplete} / ${TRADE_META.length}</strong><small>verified complete</small></div>
        <button type="button" data-action="open-clashes"><span>Clashes</span><strong>${clashes.length}</strong><small>${clashes.length ? 'need reconciliation' : 'records agree'}</small></button>
      </div>
    </section>`;
}

renderTradeTaskView = function renderTradeTaskViewWithReadinessAndHandoffs() {
  const room = selectedRoom();
  let html = readinessUiRenderTradeTaskViewBase();
  html = html.replace('<div class="content">', `<div class="content">${renderVerificationCorePanel(room)}${renderRoomReadinessPanel(room)}${renderRoomHandoffPanel(room)}`);
  return html;
};

function latestVerificationForTask(task, view = activeTaskInterface()) {
  return verificationHistoryForTask(task).filter((entry) => entry.view === view).slice(-1)[0] || null;
}

renderTradeTaskModal = function renderTradeTaskModalWithHandoffAndAudit() {
  const tradeName = ui.modal?.trade;
  const room = selectedRoom();
  const trade = roomTrades().find((item) => item.name === tradeName);
  if (!trade) return '';
  const currentView = activeTaskInterface();
  const otherView = currentView === 'trade' ? 'turner' : 'trade';
  const tasks = roomTasks().filter((task) => task.trade === tradeName);
  const taskList = tasks.length ? `<div class="trade-task-modal-list">${tasks.map((task) => {
    const otherStatus = taskStatusForView(task, otherView);
    const latest = latestVerificationForTask(task, currentView);
    return `
      <article class="trade-task-modal-item trade-task-modal-item--editable ${taskHasStatusClash(task) ? 'task-row--clash' : ''}">
        <div class="trade-task-modal-item__top"><div><div class="strong">${escapeHtml(task.title)} ${renderTaskClashBadge(task, true)}</div><div class="small muted">${escapeHtml(task.description)}</div></div><div class="trade-task-status-editor"><label>${escapeHtml(taskInterfaceLabel(currentView))} status</label>${taskStatusSelect(task)}</div></div>
        <div class="trade-task-modal-item__comparison"><span>Other interface: <strong>${escapeHtml(taskInterfaceLabel(otherView))}</strong></span>${taskStatusMarkup(otherStatus)}</div>
        <div class="verification-audit-line">${icon('clock')} ${latest ? `${escapeHtml(latest.user)} changed this record to ${escapeHtml(taskStatusLabel(latest.status))} · ${formatCommentTime(latest.createdAt)}` : 'No verification changes recorded yet.'}</div>
        <div class="trade-task-modal-item__meta"><span>Assigned to ${escapeHtml(task.assignee)}</span><span>Due ${formatDate(task.dueDate)}</span>${renderTaskCommentButton(task, true)}</div>
      </article>`;
  }).join('')}</div>` : `<div class="empty-state"><div class="empty-state__icon">${icon('tasks')}</div><strong>No ${escapeHtml(tradeName)} tasks in this room yet.</strong><p class="muted small no-margin">Add the first task. It will appear in both interfaces.</p></div>`;
  const canRequest = trade.status === 'complete';
  const body = `<div class="trade-task-modal-summary">${tradeIcon(tradeName)}<div><div class="strong">${escapeHtml(taskInterfaceLabel(currentView))} · ${room.category === 'exterior' ? 'Area' : 'Room'} ${escapeHtml(room.number)}</div><div class="small muted">${trade.complete} of ${trade.total} tasks complete · ${trade.percent}%${trade.conflicts ? ` · ${trade.conflicts} clash${trade.conflicts === 1 ? '' : 'es'}` : ''}</div></div></div>${makeProgress(trade.percent, trade.status === 'complete' ? 'var(--green)' : trade.status === 'in-progress' ? 'var(--orange)' : '#dfe4ee')}<div class="individual-task-status-note">Each task is independently updated in ${escapeHtml(taskInterfaceLabel(currentView))}. A disagreement with the other interface becomes a real, correctable clash.</div>${taskList}`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button>${canRequest ? `<button class="button button--secondary" type="button" data-action="open-request-handoff" data-room="${escapeHtml(room.id)}" data-trade="${escapeHtml(tradeName)}">${icon('external')}Request Handoff</button>` : ''}<button class="button button--primary" type="button" data-action="open-add-task" data-trade="${escapeHtml(tradeName)}">${icon('plus')}Add Task</button>`;
  return modalShell(`${tradeName} Tasks`, body, footer);
};

function renderReadinessDetailsModal() {
  const room = data.rooms.find((item) => item.id === ui.modal?.roomId) || selectedRoom();
  if (!room) return '';
  const readiness = roomReadiness(room);
  const list = (title, items, renderer) => `<section class="readiness-detail-section"><div class="documentation-section__head"><h3>${escapeHtml(title)}</h3><span class="count-pill">${items.length}</span></div>${items.length ? `<div class="readiness-detail-list">${items.map(renderer).join('')}</div>` : '<div class="empty-state"><strong>None</strong></div>'}</section>`;
  const body = `
    <div class="readiness-detail-header readiness-detail-header--${escapeHtml(readiness.tone)}"><div>${renderReadinessPill(readiness)}<h2>${escapeHtml(readiness.score)}% readiness</h2><p>${escapeHtml(readiness.nextAction)}</p></div></div>
    ${list('Verification Clashes', readiness.clashes, (task) => `<button class="readiness-detail-item" type="button" data-action="open-clashes"><span>${icon('bolt')}</span><div><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.trade)} · Trade ${taskStatusLabel(task.tradeStatus)} / Turner ${taskStatusLabel(task.turnerStatus)}</small></div>${icon('chevron')}</button>`)}
    ${list('Blocking Constraints', readiness.blockingConstraints, (item) => `<button class="readiness-detail-item" type="button" data-action="open-constraint" data-constraint="${escapeHtml(item.id)}"><span>${icon('alert')}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.impact.type)}${item.impact.delayDays ? ` · ${item.impact.delayDays} day impact` : ''}</small></div>${icon('chevron')}</button>`)}
    ${list('Required Inspection Gates', readiness.pendingGates, (item) => `<button class="readiness-detail-item" type="button" data-action="go" data-hash="#inspections/${encodeURIComponent(item.trade)}"><span>${icon('inspections')}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(READINESS_GATE_STAGES.find((stage) => stage.value === item.gateStage)?.label || 'Turnover')} · ${inspectionStatusMarkup(item.status)}</small></div>${icon('chevron')}</button>`)}
    ${list('Open Handoffs', readiness.requestedHandoffs.concat(readiness.rejectedHandoffs), (item) => `<button class="readiness-detail-item" type="button" data-action="open-handoff-response" data-handoff="${escapeHtml(item.id)}"><span>${icon('external')}</span><div><strong>${escapeHtml(item.fromTrade)} to ${escapeHtml(item.toTrade)}</strong><small>${escapeHtml(HANDOFF_STATUS_LABELS[item.status])} · Due ${formatDate(item.dueDate)}</small></div>${icon('chevron')}</button>`)}
  `;
  return modalShell(`${room.category === 'exterior' ? 'Area' : 'Room'} ${room.number} Readiness`, body, `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="button" data-action="open-quick-update" data-room="${escapeHtml(room.id)}">Quick Update</button>`);
}

function renderRequestHandoffModal() {
  const room = data.rooms.find((item) => item.id === ui.modal?.roomId) || selectedRoom();
  if (!room) return '';
  const fromTrade = ui.modal?.trade || HANDOFF_TRADE_SEQUENCE.find((trade) => isTradeCompleteForRoom(room.id, trade, activeTaskInterface())) || HANDOFF_TRADE_SEQUENCE[0];
  const toTrade = nextSuggestedTrade(room.id, fromTrade);
  return modalShell('Request Trade Handoff', `
    <form id="handoff-request-form" class="form-grid" data-comment-submit-label="Request Handoff">
      <input type="hidden" name="buildingId" value="${escapeHtml(room.buildingId)}" /><input type="hidden" name="roomId" value="${escapeHtml(room.id)}" />
      <div class="field field--full record-form-context"><span>${icon('room')}</span><div><strong>${room.category === 'exterior' ? 'Area' : 'Room'} ${escapeHtml(room.number)} · ${escapeHtml(room.name)}</strong><small>${escapeHtml(room.location)} · ${escapeHtml(room.floor || room.level)}</small></div></div>
      <div class="field"><label for="handoff-from-trade">From trade</label><select class="select" id="handoff-from-trade" name="fromTrade">${TRADE_META.map((trade) => `<option value="${escapeHtml(trade.name)}" ${trade.name === fromTrade ? 'selected' : ''}>${escapeHtml(trade.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="handoff-to-trade">Next trade</label><select class="select" id="handoff-to-trade" name="toTrade">${TRADE_META.filter((trade) => trade.name !== fromTrade).map((trade) => `<option value="${escapeHtml(trade.name)}" ${trade.name === toTrade ? 'selected' : ''}>${escapeHtml(trade.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="handoff-due">Accept by</label><input class="input" id="handoff-due" name="dueDate" type="date" required value="${dateOffset(2)}" /></div>
      <div class="field field--full"><label for="handoff-note">Handoff note</label><textarea class="textarea" id="handoff-note" name="note" placeholder="What is complete, what should the next trade verify, and what remains protected?"></textarea></div>
      ${renderImageUploadField({ id: 'handoff-images', name: 'handoffImages', label: 'Handoff photos', help: 'Optional. Add proof of completion, protection, or access conditions.' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="handoff-request-form">Request Handoff</button>`);
}

function renderHandoffResponseModal() {
  const item = data.handoffs.find((handoff) => handoff.id === ui.modal?.handoffId);
  if (!item) return '';
  const room = data.rooms.find((candidate) => candidate.id === item.roomId);
  const history = item.history.slice().reverse();
  const body = `
    <div class="handoff-detail-route">${tradeIcon(item.fromTrade)}<strong>${escapeHtml(item.fromTrade)}</strong>${icon('chevron')}${tradeIcon(item.toTrade)}<strong>${escapeHtml(item.toTrade)}</strong></div>
    <div class="handoff-detail-context"><span>${room ? `${room.category === 'exterior' ? 'Area' : 'Room'} ${escapeHtml(room.number)} · ${escapeHtml(room.name)}` : 'Unknown location'}</span><span>Due ${formatDate(item.dueDate)}</span>${renderReadinessPill(room ? roomReadiness(room) : null, true)}</div>
    ${item.note ? `<div class="handoff-detail-note"><strong>Request note</strong><p>${escapeHtml(item.note)}</p>${renderAttachmentGallery(item.attachments, true)}</div>` : ''}
    <div class="handoff-detail-status handoff-detail-status--${escapeHtml(item.status)}"><strong>${escapeHtml(HANDOFF_STATUS_LABELS[item.status] || item.status)}</strong><span>Last updated ${formatCommentTime(item.updatedAt)}</span></div>
    ${history.length ? `<div class="handoff-history">${history.map((entry) => `<div><strong>${escapeHtml(entry.action)}</strong><span>${escapeHtml(entry.user)} · ${formatCommentTime(entry.createdAt)}</span>${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ''}</div>`).join('')}</div>` : ''}
    ${item.status === 'requested' || item.status === 'rejected' ? `<form id="handoff-response-form" class="form-grid"><input type="hidden" name="handoffId" value="${escapeHtml(item.id)}" /><div class="field field--full"><label for="handoff-response-note">Response note</label><textarea class="textarea" id="handoff-response-note" name="note" placeholder="Add acceptance conditions or describe the correction needed"></textarea></div>${renderImageUploadField({ id: 'handoff-response-images', name: 'handoffResponseImages', label: 'Response photos' })}<div class="handoff-response-choice field--full"><label><input type="radio" name="decision" value="accepted" checked /><span>${icon('check')}Accept Handoff</span></label><label><input type="radio" name="decision" value="rejected" /><span>${icon('x')}Needs Correction</span></label></div></form>` : ''}`;
  const footer = item.status === 'requested' || item.status === 'rejected'
    ? `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="submit" form="handoff-response-form">Submit Response</button>`
    : `<button class="button button--primary" type="button" data-action="close-modal">Close</button>`;
  return modalShell('Trade Handoff', body, footer);
}
