'use strict';

/* Constraints are owned by a building and are never tied to a room. */

const buildingConstraintRenderModalBase = renderModal;

constraintPriorityActiveCount = function constraintPriorityActiveCountForBuilding(priority) {
  return constraintsForBuilding().filter((item) => item.priority === priority && item.status === 'active').length;
};

constraintPriorityTotalCount = function constraintPriorityActiveTotalForBuilding(priority) {
  return constraintsForBuilding().filter((item) => item.priority === priority && item.status === 'active').length;
};

renderConstraintAccordion = function renderBuildingConstraintAccordion(priority) {
  const label = priorityLabel(priority);
  const expanded = Boolean(ui.constraintExpanded[priority]);
  const items = constraintsForBuilding().filter((item) => item.priority === priority && item.status === 'active');
  return `
    <section class="constraint-accordion-group constraint-accordion-group--${priority}" id="constraint-group-${priority}">
      <button class="constraint-accordion-header" type="button" data-action="constraint-accordion-toggle" data-priority="${priority}" aria-expanded="${expanded}">
        <span class="constraint-accordion-header__icon">${constraintPriorityIcon(priority)}</span>
        <span class="constraint-accordion-header__label">${escapeHtml(label)}</span>
        <span class="constraint-accordion-header__count">${items.length}</span>
        <span class="constraint-accordion-header__chevron ${expanded ? 'is-open' : ''}">${icon('down')}</span>
      </button>
      ${expanded ? `<div class="constraint-accordion-body">${items.map(renderReferenceConstraintCard).join('') || `<div class="empty-state"><div class="empty-state__icon">${icon('check')}</div><strong>No active ${escapeHtml(label)} constraints for this building.</strong></div>`}</div>` : ''}
    </section>`;
};

renderResolvedConstraintSection = function renderResolvedConstraintSectionForBuilding() {
  const items = constraintsForBuilding().filter((item) => item.status === 'resolved');
  const expanded = ui.resolvedConstraintsExpanded;
  return `
    <section class="resolved-constraint-section" id="constraint-group-resolved">
      <button class="resolved-constraint-header" type="button" data-action="resolved-constraints-toggle" aria-expanded="${expanded}">
        <span class="resolved-constraint-header__icon">${icon('check')}</span>
        <span class="resolved-constraint-header__label">Resolved</span>
        <span class="resolved-constraint-header__count">${items.length}</span>
        <span class="resolved-constraint-header__copy">Completed building constraint records</span>
        <span class="resolved-constraint-header__chevron ${expanded ? 'is-open' : ''}">${icon('down')}</span>
      </button>
      ${expanded ? `<div class="resolved-constraint-body">${items.map((item) => `
        <div class="resolved-constraint-card-wrap">
          <div class="resolved-constraint-priority">${priorityLabel(item.priority)}</div>
          ${renderReferenceConstraintCard(item)}
        </div>`).join('') || `<div class="empty-state resolved-constraint-empty"><div class="empty-state__icon">${icon('check')}</div><strong>No resolved constraints for this building.</strong><p class="muted small no-margin">Resolved records move here and keep all comments and images.</p></div>`}</div>` : ''}
    </section>`;
};

renderConstraints = function renderBuildingScopedConstraints() {
  const building = scopedBuilding();
  if (!building) return renderHome();
  const total = constraintsForBuilding(building.id).length;
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Constraints' })}
      <main class="page page--canvas constraint-reference-page">
        <div class="content">
          <section class="record-scope-card record-scope-card--building-only section">
            <div class="record-scope-card__icon">${icon('building')}</div>
            <div class="record-scope-card__copy"><strong>Building Constraints</strong><span>${total} record${total === 1 ? '' : 's'} for the selected building</span></div>
            ${renderBuildingScopeSelect('constraint-building-scope', 'Building', 'Constraints are building-level and are not assigned to individual rooms.')}
          </section>
          <section class="constraint-summary-section">
            <div class="section-head constraint-summary-heading"><h2>Constraint Summary</h2><button class="button button--primary" type="button" data-action="open-add-constraint">${icon('plus')}Add Constraint</button></div>
            <div class="constraint-summary-grid">${['critical', 'moderate', 'low'].map(renderConstraintSummaryCard).join('')}</div>
            <p class="constraint-summary-help">Tap a priority to view active constraints for ${escapeHtml(building.name)}. Resolved records are stored in the blue section below.</p>
          </section>
          <div class="constraint-accordion-list">
            ${renderConstraintAccordion('critical')}
            ${renderConstraintAccordion('moderate')}
            ${renderConstraintAccordion('low')}
            ${renderResolvedConstraintSection()}
          </div>
        </div>
      </main>
      ${renderBottomNav('constraints')}
      ${renderDrawer('constraints')}
    </div>`;
};

function renderBuildingScopedConstraintModal() {
  const building = scopedBuilding();
  if (!building) return '';
  return modalShell('Add Building Constraint', `
    <form id="add-constraint-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <div class="field field--full record-form-context"><span>${icon('building')}</span><div><strong>${escapeHtml(building.name)}</strong><small>Building-level constraint - no room assignment</small></div></div>
      <div class="field field--full"><label for="constraint-title">Constraint title</label><input class="input" id="constraint-title" name="title" required placeholder="What is blocking work in this building?" /></div>
      <div class="field field--full"><label for="constraint-description">Description</label><textarea class="textarea" id="constraint-description" name="description" required placeholder="Explain the issue, building impact, and action needed"></textarea></div>
      <div class="field"><label for="constraint-type">Type</label><select class="select" id="constraint-type" name="type"><option>Schedule</option><option>Resource</option><option>Coordination</option><option>Design</option><option>Material</option><option>Access</option></select></div>
      <div class="field"><label for="constraint-priority">Priority</label><select class="select" id="constraint-priority" name="priority"><option value="critical">Critical Path</option><option value="moderate">Moderate</option><option value="low">Low</option></select></div>
      <div class="field"><label for="constraint-resolve-by">Resolve By</label><input class="input" id="constraint-resolve-by" name="resolveBy" type="date" required value="${dateOffset(7)}" /></div>
      <div class="field"><label for="constraint-owner">Owner</label><input class="input" id="constraint-owner" name="owner" required value="${CURRENT_USER}" /></div>
      ${renderImageUploadField({ id: 'constraint-images', name: 'constraintImages', label: 'Constraint images', help: 'Optional. Add building photos, drawings, or other visual documentation.' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-constraint-form">Add Constraint</button>`);
}

renderConstraintDetailModal = function renderBuildingConstraintDetailModal() {
  const item = data.constraints.find((constraint) => constraint.id === ui.modal?.constraintId);
  if (!item) return '';
  normalizeConstraint(item);
  const building = data.buildings.find((candidate) => candidate.id === item.buildingId) || scopedBuilding();
  const comments = constraintComments(item);
  const body = `
    <div class="constraint-detail-header"><div class="constraint-detail-header__icon ${item.status === 'resolved' ? 'icon-green' : item.priority === 'critical' ? 'icon-red' : item.priority === 'moderate' ? 'icon-orange' : 'icon-blue'}">${item.status === 'resolved' ? icon('check') : icon('clock')}</div><div><div class="constraint-detail-badges"><span class="status-pill ${item.status === 'resolved' ? 'status-pill--resolved' : 'status-pill--complete'}">${escapeHtml(item.status === 'resolved' ? 'Resolved' : 'Active')}</span><span class="status-pill ${priorityClass(item.priority)}">${priorityLabel(item.priority)}</span><span class="status-pill status-pill--pending">${escapeHtml(item.type)}</span></div><p class="constraint-detail-description">${escapeHtml(item.description)}</p></div></div>
    <div class="constraint-detail-meta constraint-detail-meta--building"><div><span>Building</span><strong>${escapeHtml(building?.name || 'Unknown Building')}</strong></div><div><span>Owner</span><strong>${escapeHtml(item.owner)}</strong></div><div><span>Resolve By</span><strong>${formatDate(item.endDate)}</strong></div></div>
    ${item.attachments.length ? `<section class="documentation-section"><div class="documentation-section__head"><h3>Constraint Images</h3><span class="count-pill">${item.attachments.length}</span></div>${renderAttachmentGallery(item.attachments)}</section>` : ''}
    <section class="documentation-section"><div class="documentation-section__head"><h3>Comments & Documentation</h3><span class="count-pill">${comments.length}</span></div>${renderDocumentationThread(comments, 'No constraint comments yet.', 'Add a coordination note or image to the permanent building record.')}</section>
    <form id="constraint-comment-form" class="task-comment-form form-grid">
      <input type="hidden" name="constraintId" value="${escapeHtml(item.id)}" />
      <div class="field field--full"><label for="constraint-comment-body">Add comment</label><textarea class="textarea" id="constraint-comment-body" name="body" placeholder="Add an update, decision, or coordination note"></textarea></div>
      ${renderImageUploadField({ id: 'constraint-comment-images', name: 'constraintCommentImages', label: 'Add images to this comment' })}
    </form>`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--secondary" type="button" data-action="toggle-constraint-from-detail" data-constraint="${escapeHtml(item.id)}">${item.status === 'resolved' ? 'Reopen Constraint' : 'Resolve Constraint'}</button><button class="button button--primary" type="submit" form="constraint-comment-form">${icon('comment')}Add Documentation</button>`;
  return modalShell(item.title, body, footer);
};

renderModal = function renderModalWithBuildingConstraints() {
  if (ui.modal?.type === 'add-constraint') return renderBuildingScopedConstraintModal();
  return buildingConstraintRenderModalBase();
};

addConstraintFromForm = async function addBuildingConstraintFromForm(formData) {
  try {
    const buildingId = String(formData.get('buildingId') || scopedBuilding()?.id || '');
    const building = data.buildings.find((candidate) => candidate.id === buildingId);
    if (!building) {
      toast('Choose a valid building before adding the constraint.');
      return;
    }
    const attachments = await attachmentsFromForm(formData, 'constraintImages');
    const item = {
      id: nextId('c'),
      buildingId,
      title: String(formData.get('title')).trim(),
      type: String(formData.get('type')) === 'Clash' ? 'Coordination' : String(formData.get('type')),
      priority: String(formData.get('priority')),
      status: 'active',
      description: String(formData.get('description')).trim(),
      startDate: dateOffset(0),
      endDate: String(formData.get('resolveBy')),
      owner: String(formData.get('owner')).trim(),
      attachments,
      comments: []
    };
    const activityLength = data.activity.length;
    data.constraints.unshift(item);
    addActivity('progress', `${item.title} added to ${building.name} as a ${priorityLabel(item.priority)} constraint`);
    if (!persistWithRollback(() => {
      const itemIndex = data.constraints.indexOf(item);
      if (itemIndex >= 0) data.constraints.splice(itemIndex, 1);
      data.activity.splice(activityLength);
    })) return;
    ui.modal = null;
    render();
    toast(attachments.length ? `Constraint and images added to ${building.name}.` : `Constraint added to ${building.name}.`);
  } catch (error) {
    console.warn('TradeSYNC could not add the building constraint.', error);
    toast(error.message || 'The constraint could not be added.');
  }
};

document.addEventListener('change', (event) => {
  if (event.target.dataset.control !== 'constraint-building-scope') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  ui.selectedBuildingId = event.target.value;
  render();
  toast(`Showing constraints for ${scopedBuilding()?.name || 'the selected building'}.`);
}, true);

if (route().view === 'constraints') render();
