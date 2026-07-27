'use strict';

function renderEnhancedConstraintModal() {
  return modalShell('Add Constraint', `
    <form id="add-constraint-form" class="form-grid">
      <div class="field field--full"><label for="constraint-title">Constraint title</label><input class="input" id="constraint-title" name="title" required placeholder="What is blocking the work?" /></div>
      <div class="field field--full"><label for="constraint-description">Description</label><textarea class="textarea" id="constraint-description" name="description" required placeholder="Explain the issue, impact, and action needed"></textarea></div>
      <div class="field"><label for="constraint-type">Type</label><select class="select" id="constraint-type" name="type"><option>Schedule</option><option>Resource</option><option>Coordination</option><option>Design</option><option>Material</option><option>Access</option></select></div>
      <div class="field"><label for="constraint-priority">Priority</label><select class="select" id="constraint-priority" name="priority"><option value="critical">Critical Path</option><option value="moderate">Moderate</option><option value="low">Low</option></select></div>
      <div class="field"><label for="constraint-resolve-by">Resolve By</label><input class="input" id="constraint-resolve-by" name="resolveBy" type="date" required value="${dateOffset(7)}" /></div>
      <div class="field"><label for="constraint-owner">Owner</label><input class="input" id="constraint-owner" name="owner" required value="${CURRENT_USER}" /></div>
      ${renderImageUploadField({ id: 'constraint-images', name: 'constraintImages', label: 'Constraint images', help: 'Optional. Add field photos, marked-up drawings, or other visual documentation.' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-constraint-form">Add Constraint</button>`);
}

renderConstraintCard = function renderClickableConstraintCard(item) {
  normalizeConstraint(item);
  const iconClass = item.status === 'resolved' ? 'icon-green' : item.priority === 'critical' ? 'icon-red' : item.priority === 'moderate' ? 'icon-orange' : 'icon-blue';
  const commentCount = constraintComments(item).length;
  const imageCount = item.attachments.length + item.comments.reduce((sum, comment) => sum + normalizeAttachments(comment.attachments).length, 0);
  return `
    <article class="constraint-card constraint-card--interactive">
      <div class="constraint-card__top">
        <button class="constraint-card__open" type="button" data-action="open-constraint" data-constraint="${escapeHtml(item.id)}">
          <span class="constraint-card__icon ${iconClass}">${item.status === 'resolved' ? icon('check') : icon('clock')}</span>
          <span class="constraint-card__content"><span class="constraint-card__title">${escapeHtml(item.title)}</span><span><span class="status-pill ${item.status === 'resolved' ? 'status-pill--resolved' : 'status-pill--complete'}">${escapeHtml(item.type)}</span> <span class="small muted">• ${item.status === 'resolved' ? 'Resolved' : 'Active'}</span></span><span class="constraint-card__description">${escapeHtml(item.description)}</span><span class="constraint-document-count">${icon('comment')} ${commentCount} comment${commentCount === 1 ? '' : 's'}${imageCount ? ` · ${imageCount} image${imageCount === 1 ? '' : 's'}` : ''}</span></span>
          <span class="constraint-card__chevron">${icon('chevron')}</span>
        </button>
        <button class="button button--secondary button--small" type="button" data-action="toggle-constraint" data-constraint="${escapeHtml(item.id)}">${item.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
      </div>
      <div class="constraint-card__footer"><div class="small">${icon('calendar')} <strong>Resolve By:</strong> ${formatDate(item.endDate)}</div><span class="status-pill ${priorityClass(item.priority)}">${priorityLabel(item.priority)}</span></div>
    </article>`;
};

function renderConstraintDetailModal() {
  const item = data.constraints.find((constraint) => constraint.id === ui.modal?.constraintId);
  if (!item) return '';
  normalizeConstraint(item);
  const comments = constraintComments(item);
  const body = `
    <div class="constraint-detail-header"><div class="constraint-detail-header__icon ${item.status === 'resolved' ? 'icon-green' : item.priority === 'critical' ? 'icon-red' : item.priority === 'moderate' ? 'icon-orange' : 'icon-blue'}">${item.status === 'resolved' ? icon('check') : icon('clock')}</div><div><div class="constraint-detail-badges"><span class="status-pill ${item.status === 'resolved' ? 'status-pill--resolved' : 'status-pill--complete'}">${escapeHtml(item.status === 'resolved' ? 'Resolved' : 'Active')}</span><span class="status-pill ${priorityClass(item.priority)}">${priorityLabel(item.priority)}</span><span class="status-pill status-pill--pending">${escapeHtml(item.type)}</span></div><p class="constraint-detail-description">${escapeHtml(item.description)}</p></div></div>
    <div class="constraint-detail-meta"><div><span>Owner</span><strong>${escapeHtml(item.owner)}</strong></div><div><span>Resolve By</span><strong>${formatDate(item.endDate)}</strong></div></div>
    ${item.attachments.length ? `<section class="documentation-section"><div class="documentation-section__head"><h3>Constraint Images</h3><span class="count-pill">${item.attachments.length}</span></div>${renderAttachmentGallery(item.attachments)}</section>` : ''}
    <section class="documentation-section"><div class="documentation-section__head"><h3>Comments & Documentation</h3><span class="count-pill">${comments.length}</span></div>${renderDocumentationThread(comments, 'No constraint comments yet.', 'Add a coordination note or image to the permanent record.')}</section>
    <form id="constraint-comment-form" class="task-comment-form form-grid">
      <input type="hidden" name="constraintId" value="${escapeHtml(item.id)}" />
      <div class="field field--full"><label for="constraint-comment-body">Add comment</label><textarea class="textarea" id="constraint-comment-body" name="body" placeholder="Add an update, decision, or coordination note"></textarea></div>
      ${renderImageUploadField({ id: 'constraint-comment-images', name: 'constraintCommentImages', label: 'Add images to this comment' })}
    </form>`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--secondary" type="button" data-action="toggle-constraint-from-detail" data-constraint="${escapeHtml(item.id)}">${item.status === 'resolved' ? 'Reopen Constraint' : 'Resolve Constraint'}</button><button class="button button--primary" type="submit" form="constraint-comment-form">${icon('comment')}Add Documentation</button>`;
  return modalShell(item.title, body, footer);
}
