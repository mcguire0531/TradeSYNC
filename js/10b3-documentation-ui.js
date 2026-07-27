function renderAttachmentGallery(attachments, compact = false) {
  const images = normalizeAttachments(attachments);
  if (!images.length) return '';
  return `<div class="documentation-images ${compact ? 'documentation-images--compact' : ''}">${images.map((attachment) => `
    <a class="documentation-image" href="${escapeHtml(attachment.dataUrl)}" target="_blank" rel="noopener" title="Open ${escapeHtml(attachment.name)}">
      <img src="${escapeHtml(attachment.dataUrl)}" alt="${escapeHtml(attachment.name)}" />
      <span>${escapeHtml(attachment.name)}</span>
    </a>`).join('')}</div>`;
}

function renderDocumentationThread(comments, emptyTitle = 'No comments yet.', emptyCopy = 'Add the first documentation note.') {
  const normalized = comments.map((comment) => normalizeDocumentationComment(comment)).filter(Boolean);
  if (!normalized.length) {
    return `<div class="empty-state empty-state--comments"><div class="empty-state__icon">${icon('comment')}</div><strong>${escapeHtml(emptyTitle)}</strong><p class="muted small no-margin">${escapeHtml(emptyCopy)}</p></div>`;
  }
  return `<div class="comment-thread">${normalized.map((comment) => {
    const initials = (comment.author || 'U').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    return `<article class="task-comment"><div class="task-comment__avatar">${escapeHtml(initials)}</div><div class="task-comment__content"><div class="task-comment__meta"><strong>${escapeHtml(comment.author || CURRENT_USER)}</strong><span>${formatCommentTime(comment.createdAt)}</span></div>${comment.body ? `<p>${escapeHtml(comment.body)}</p>` : ''}${renderAttachmentGallery(comment.attachments, true)}</div></article>`;
  }).join('')}</div>`;
}

