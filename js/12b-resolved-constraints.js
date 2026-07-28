'use strict';

/* Move resolved constraints into a dedicated Turner-blue section. */

if (typeof ui.resolvedConstraintsExpanded !== 'boolean') ui.resolvedConstraintsExpanded = true;

constraintPriorityTotalCount = function constraintPriorityActiveTotal(priority) {
  return data.constraints.filter((item) => item.priority === priority && item.status === 'active').length;
};

renderConstraintAccordion = function renderActiveConstraintAccordion(priority) {
  const label = priorityLabel(priority);
  const expanded = Boolean(ui.constraintExpanded[priority]);
  const items = data.constraints.filter((item) => item.priority === priority && item.status === 'active');
  return `
    <section class="constraint-accordion-group constraint-accordion-group--${priority}" id="constraint-group-${priority}">
      <button class="constraint-accordion-header" type="button" data-action="constraint-accordion-toggle" data-priority="${priority}" aria-expanded="${expanded}">
        <span class="constraint-accordion-header__icon">${constraintPriorityIcon(priority)}</span>
        <span class="constraint-accordion-header__label">${escapeHtml(label)}</span>
        <span class="constraint-accordion-header__count">${items.length}</span>
        <span class="constraint-accordion-header__chevron ${expanded ? 'is-open' : ''}">${icon('down')}</span>
      </button>
      ${expanded ? `<div class="constraint-accordion-body">${items.map(renderReferenceConstraintCard).join('') || `<div class="empty-state"><div class="empty-state__icon">${icon('check')}</div><strong>No active ${escapeHtml(label)} constraints.</strong></div>`}</div>` : ''}
    </section>`;
};

function renderResolvedConstraintSection() {
  const items = data.constraints.filter((item) => item.status === 'resolved');
  const expanded = ui.resolvedConstraintsExpanded;
  return `
    <section class="resolved-constraint-section" id="constraint-group-resolved">
      <button class="resolved-constraint-header" type="button" data-action="resolved-constraints-toggle" aria-expanded="${expanded}">
        <span class="resolved-constraint-header__icon">${icon('check')}</span>
        <span class="resolved-constraint-header__label">Resolved</span>
        <span class="resolved-constraint-header__count">${items.length}</span>
        <span class="resolved-constraint-header__copy">Completed constraint records</span>
        <span class="resolved-constraint-header__chevron ${expanded ? 'is-open' : ''}">${icon('down')}</span>
      </button>
      ${expanded ? `<div class="resolved-constraint-body">${items.map((item) => `
        <div class="resolved-constraint-card-wrap">
          <div class="resolved-constraint-priority">${priorityLabel(item.priority)}</div>
          ${renderReferenceConstraintCard(item)}
        </div>`).join('') || `<div class="empty-state resolved-constraint-empty"><div class="empty-state__icon">${icon('check')}</div><strong>No resolved constraints yet.</strong><p class="muted small no-margin">When Resolve is selected, the constraint moves here and keeps all comments and images.</p></div>`}</div>` : ''}
    </section>`;
}

renderConstraints = function renderConstraintsWithResolvedSection() {
  return `
    <div class="app-shell">
      ${renderTopbar({ title: 'Constraints' })}
      <main class="page page--canvas constraint-reference-page">
        <div class="content">
          <section class="constraint-summary-section">
            <div class="section-head constraint-summary-heading"><h2>Constraint Summary</h2><button class="button button--primary" type="button" data-action="open-add-constraint">${icon('plus')}Add Constraint</button></div>
            <div class="constraint-summary-grid">${['critical', 'moderate', 'low'].map(renderConstraintSummaryCard).join('')}</div>
            <p class="constraint-summary-help">Tap a priority to view active constraints. Resolved records are stored in the blue section below.</p>
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

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action="resolved-constraints-toggle"]');
  if (!trigger) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  ui.resolvedConstraintsExpanded = !ui.resolvedConstraintsExpanded;
  render();
}, true);

if (route().view === 'constraints') render();
