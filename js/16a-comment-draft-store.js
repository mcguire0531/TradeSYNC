'use strict';

/*
 * Comment draft, image attachment, and pasted screenshot support.
 * Drafts stay local until the user submits the comment.
 */

const COMMENT_DRAFT_STORAGE_KEY = 'tradesync-comment-drafts-v1';
const COMMENT_DRAFT_VERSION = 1;
const COMMENT_DRAFT_AUTOSAVE_DELAY = 900;
const commentDraftTimers = new Map();
const commentDraftPendingImages = new Map();
const commentDraftAttachmentsFromFormBase = attachmentsFromForm;
const commentDraftRenderBase = render;
const commentDraftAddTaskBase = addTaskFromEnhancedForm;
const commentDraftAddTaskCommentBase = addCommentFromForm;
const commentDraftAddInspectionCommentBase = addInspectionCommentFromForm;
const commentDraftAddConstraintCommentBase = addConstraintCommentFromForm;

function loadCommentDraftStore() {
  try {
    const raw = localStorage.getItem(COMMENT_DRAFT_STORAGE_KEY);
    if (!raw) return { version: COMMENT_DRAFT_VERSION, drafts: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== COMMENT_DRAFT_VERSION || typeof parsed.drafts !== 'object') {
      return { version: COMMENT_DRAFT_VERSION, drafts: {} };
    }
    Object.values(parsed.drafts).forEach((draft) => {
      draft.body = String(draft.body || '');
      draft.updatedAt = String(draft.updatedAt || '');
      draft.attachments = normalizeAttachments(draft.attachments);
    });
    return parsed;
  } catch (error) {
    console.warn('TradeSYNC could not load comment drafts.', error);
    return { version: COMMENT_DRAFT_VERSION, drafts: {} };
  }
}

let commentDraftStore = loadCommentDraftStore();

function persistCommentDraftStore() {
  try {
    localStorage.setItem(COMMENT_DRAFT_STORAGE_KEY, JSON.stringify(commentDraftStore));
    return true;
  } catch (error) {
    console.warn('TradeSYNC could not save the comment draft.', error);
    toast('The draft could not be saved. Remove an image or free browser storage.');
    return false;
  }
}

function getCommentDraft(key) {
  if (!key) return null;
  const draft = commentDraftStore.drafts[key];
  if (!draft) return null;
  draft.attachments = normalizeAttachments(draft.attachments);
  return draft;
}

function setCommentDraft(key, draft) {
  if (!key) return false;
  const previous = commentDraftStore.drafts[key];
  const body = String(draft.body || '');
  const attachments = normalizeAttachments(draft.attachments);
  if (!body.trim() && !attachments.length) {
    delete commentDraftStore.drafts[key];
    if (persistCommentDraftStore()) return true;
    if (previous) commentDraftStore.drafts[key] = previous;
    return false;
  }
  commentDraftStore.drafts[key] = {
    body,
    attachments,
    context: String(draft.context || ''),
    updatedAt: new Date().toISOString()
  };
  if (persistCommentDraftStore()) return true;
  if (previous) commentDraftStore.drafts[key] = previous;
  else delete commentDraftStore.drafts[key];
  return false;
}

function deleteCommentDraft(key) {
  if (!key || !commentDraftStore.drafts[key]) return;
  delete commentDraftStore.drafts[key];
  persistCommentDraftStore();
  commentDraftTimers.delete(key);
}

function clearAllCommentDrafts() {
  commentDraftTimers.forEach((timer) => clearTimeout(timer));
  commentDraftTimers.clear();
  commentDraftPendingImages.clear();
  commentDraftStore = { version: COMMENT_DRAFT_VERSION, drafts: {} };
  try {
    localStorage.removeItem(COMMENT_DRAFT_STORAGE_KEY);
  } catch (error) {
    console.warn('TradeSYNC could not clear comment drafts.', error);
  }
}

function commentDraftFormSpec(form) {
  if (!form) return null;
  const formId = form.id;
  if (formId === 'task-comment-form') {
    const taskId = String(form.elements.taskId?.value || ui.modal?.taskId || '');
    return {
      key: `task-comment:${taskId}`,
      context: 'Task comment',
      textName: 'body',
      imageName: 'taskCommentImages'
    };
  }
  if (formId === 'inspection-comment-form') {
    const inspectionId = String(form.elements.inspectionId?.value || ui.modal?.inspectionId || '');
    return {
      key: `inspection-comment:${inspectionId}`,
      context: 'Inspection comment',
      textName: 'comment',
      imageName: 'inspectionCommentImages'
    };
  }
  if (formId === 'constraint-comment-form') {
    const constraintId = String(form.elements.constraintId?.value || ui.modal?.constraintId || '');
    return {
      key: `constraint-comment:${constraintId}`,
      context: 'Constraint comment',
      textName: 'body',
      imageName: 'constraintCommentImages'
    };
  }
  if (formId === 'add-task-form' && form.elements.comment) {
    return {
      key: `new-task-comment:${ui.selectedBuildingId}:${ui.selectedRoomId}`,
      context: 'New task initial comment',
      textName: 'comment',
      imageName: 'taskCommentImages'
    };
  }
  return null;
}

function commentDraftTextarea(form, spec = commentDraftFormSpec(form)) {
  if (!form || !spec) return null;
  return form.querySelector(`textarea[name="${spec.textName}"]`);
}

function commentDraftHiddenInput(form, spec) {
  let input = form.querySelector('input[name="commentDraftKey"]');
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'commentDraftKey';
    form.appendChild(input);
  }
  input.value = spec.key;
  return input;
}

function commentDraftStatusText(draft) {
  if (!draft) return 'No saved draft';
  const date = new Date(draft.updatedAt);
  if (Number.isNaN(date.getTime())) return 'Draft saved';
  return `Draft saved ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)}`;
}

function commentDraftWorkspaceMarkup() {
  return `
    <section class="comment-draft-workspace" data-comment-draft-workspace>
      <div class="comment-draft-heading">
        <div>
          <strong>Comment Draft</strong>
          <span data-comment-draft-status>No saved draft</span>
        </div>
        <div class="comment-draft-actions">
          <button class="button button--secondary button--small" type="button" data-action="save-comment-draft">Save Draft</button>
          <button class="button button--ghost button--small" type="button" data-action="delete-comment-draft">Delete Draft</button>
        </div>
      </div>
      <p class="comment-draft-help">The draft stays private in this browser until Submit Comment is selected. Paste a screenshot directly into the comment box with Ctrl+V or Cmd+V.</p>
      <div class="comment-draft-images" data-comment-draft-images></div>
    </section>`;
}

function renderCommentDraftImages(form) {
  const spec = commentDraftFormSpec(form);
  const container = form?.querySelector('[data-comment-draft-images]');
  if (!spec || !container) return;
  const draft = getCommentDraft(spec.key);
  const attachments = normalizeAttachments(draft?.attachments);
  if (!attachments.length) {
    container.innerHTML = '<div class="comment-draft-empty-images">No draft images attached.</div>';
    return;
  }
  container.innerHTML = attachments.map((attachment) => `
    <article class="comment-draft-image">
      <a href="${escapeHtml(attachment.dataUrl)}" target="_blank" rel="noopener" title="Open ${escapeHtml(attachment.name)}">
        <img src="${escapeHtml(attachment.dataUrl)}" alt="${escapeHtml(attachment.name)}" />
      </a>
      <div><span title="${escapeHtml(attachment.name)}">${escapeHtml(attachment.name)}</span><button type="button" data-action="remove-comment-draft-image" data-image="${escapeHtml(attachment.id)}" aria-label="Remove ${escapeHtml(attachment.name)}">${icon('x')}</button></div>
    </article>`).join('');
}

function updateCommentDraftStatus(form, message = '') {
  const spec = commentDraftFormSpec(form);
  const target = form?.querySelector('[data-comment-draft-status]');
  if (!spec || !target) return;
  target.textContent = message || commentDraftStatusText(getCommentDraft(spec.key));
}

function draftAttachmentsForForm(form) {
  const spec = commentDraftFormSpec(form);
  return normalizeAttachments(getCommentDraft(spec?.key)?.attachments);
}

function saveCommentDraftFromForm(form, { silent = false } = {}) {
  const spec = commentDraftFormSpec(form);
  const textarea = commentDraftTextarea(form, spec);
  if (!spec || !textarea) return false;
  const draft = getCommentDraft(spec.key);
  const saved = setCommentDraft(spec.key, {
    body: textarea.value,
    attachments: normalizeAttachments(draft?.attachments),
    context: spec.context
  });
  if (saved) {
    updateCommentDraftStatus(form);
    renderCommentDraftImages(form);
    if (!silent) toast('Comment draft saved. It has not been submitted.');
  }
  return saved;
}

function scheduleCommentDraftAutosave(form) {
  const spec = commentDraftFormSpec(form);
  if (!spec) return;
  clearTimeout(commentDraftTimers.get(spec.key));
  updateCommentDraftStatus(form, 'Unsaved changes');
  const timer = window.setTimeout(() => {
    commentDraftTimers.delete(spec.key);
    saveCommentDraftFromForm(form, { silent: true });
  }, COMMENT_DRAFT_AUTOSAVE_DELAY);
  commentDraftTimers.set(spec.key, timer);
}
