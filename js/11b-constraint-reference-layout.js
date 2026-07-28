'use strict';

/* Constraint page layout based on the supplied grouped summary reference. */

if (!ui.constraintExpanded || typeof ui.constraintExpanded !== 'object') {
  ui.constraintExpanded = { critical: true, moderate: false, low: false };
}

function constraintPriorityIcon(priority) {
  if (priority === 'critical') return icon('clock');
  if (priority === 'moderate') return icon('alert');
  return icon('check');
}

function constraintPriorityActiveCount(priority) {
  return data.constraints.filter((item) => item.priority === priority && item.status === 'active').length;
}

function constraintPriorityTotalCount(priority) {
  return data.constraints.filter((item) => item.priority === priority).length;
}

function renderConstraintSummaryCard(priority) {
  const label = priorityLabel(priority);
  const count = constraintPriorityActiveCount(priority);
  return `
    <button class="constraint-summary-card constraint-summary-card--${priority}" type="button" data-action="constraint-summary-open" data-priority="${priority}">
      <span class="constraint-summary-card__icon">${constraintPriorityIcon(priority)}</span>
      <span class="constraint-summary-card__count">${count}</span>
      <span class="constraint-summary-card__label">${escapeHtml(label)}</span>
      <span class="constraint-summary-card__chevron">${icon('chevron')}</span>
    </button>`;
}

function renderReferenceConstraintCard(item) {
  normalizeConstraint(item);
  const imageCount = item.attachments.length + constraintComments(item).reduce((sum, comment) => sum + normalizeAttachments(comment.attachments).length, 0);
  const active = item.status === 'active';
  return `
    <article class="constraint-reference-card ${active ? '' : 'constraint-reference-card--resolved'}">
      <button class="constraint-reference-card__body" type="button" data-action="open-constraint" data-constraint="${escapeHtml(item.id)}">
        <span class="constraint-reference-card__title-row"><strong>${escapeHtml(item.title)}</strong>${icon('chevron')}</span>
        <span class="constraint-reference-card__badges"><span class="constraint-type-chip">${escapeHtml(item.type)}</span><span aria-hidden="true">•</span><span class="constraint-status-chip ${active ? 'constraint-status-chip--active' : 'constraint-status-chip--resolved'}">${active ? 'Active' : 'Resolved'}</span></span>
        <span class="constraint-reference-card__description">${escapeHtml(item.description)}</span>
      </button>
      <div class="constraint-reference-card__footer">
        <div class="constraint-resolve-by"><span>Resolve By</span><strong>${icon('calendar')} ${formatDate(item.endDate)}</strong></div>
        <div class="constraint-reference-card__actions">
          <button class="constraint-images-button" type="button" data-action="open-constraint" data-constraint="${escapeHtml(item.id)}" aria-label="Open constraint images and documentation"><span>Images${imageCount ? ` ${imageCount}` : ''}</span>${icon('upload')}</button>
          <button class="button button--secondary constraint-resolve-button" type="button" data-action="toggle-constraint" data-constraint="${escapeHtml(item.id)}">${active ? 'Resolve' : 'Reopen'}</button>
        </div>
      </div>
    </article>`;
}

function renderConstraintAccordion(priority) {
  const label = priorityLabel(priority);
  const expanded = Boolean(ui.constraintExpanded[priority]);
  const items = data.constraints.filter((item) => item.priority === priority);
  return `
    <section class="constraint-accordion-group constraint-accordion-group--${priority}" id="constraint-group-${priority}">
      <button class="constraint-accordion-header" type="button" data-action="constraint-accordion-toggle" data-priority="${priority}" aria-expanded="${expanded}">
        <span class="constraint-accordion-header__icon">${constraintPriorityIcon(priority)}</span>
        <span class="constraint-accordion-header__label">${escapeHtml(label)}</span>
        <span class="constraint-accordion-header__count">${constraintPriorityTotalCount(priority)}</span>
        <span class="constraint-accordion-header__chevron ${expanded ? 'is-open' : ''}">${icon('down')}</span>
      </button>
      ${expanded ? `<div class="constraint-accordion-body">${items.map(renderReferenceConstraintCard).join('') || `<div class="empty-state"><strong>No ${escapeHtml(label)} constraints.</strong></div>`}</div>` : ''}
    </section>`;
}

renderConstraints = function renderConstraintsLikeReference() {
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Constraints' })}
      <main class="page page--canvas constraint-reference-page">
        <div class="content">
          <section class="constraint-summary-section">
            <div class="section-head constraint-summary-heading"><h2>Constraint Summary</h2><button class="button button--primary" type="button" data-action="open-add-constraint">${icon('plus')}Add Constraint</button></div>
            <div class="constraint-summary-grid">${['critical', 'moderate', 'low'].map(renderConstraintSummaryCard).join('')}</div>
            <p class="constraint-summary-help">Tap a section above to view constraints.</p>
          </section>
          <div class="constraint-accordion-list">
            ${renderConstraintAccordion('critical')}
            ${renderConstraintAccordion('moderate')}
            ${renderConstraintAccordion('low')}
          </div>
        </div>
      </main>
      ${renderBottomNav('constraints')}
      ${renderDrawer('constraints')}
    </div>`;
};

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'constraint-summary-open') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const priority = trigger.dataset.priority;
    ui.constraintExpanded = { critical: false, moderate: false, low: false, [priority]: true };
    render();
    window.setTimeout(() => document.getElementById(`constraint-group-${priority}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  } else if (action === 'constraint-accordion-toggle') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const priority = trigger.dataset.priority;
    ui.constraintExpanded[priority] = !ui.constraintExpanded[priority];
    render();
  }
}, true);

if (route().view === 'constraints') render();
