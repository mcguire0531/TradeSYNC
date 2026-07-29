'use strict';

/* Draft, upload, paste, drag-and-drop, and close/reset events. */

document.addEventListener('input', (event) => {
  const textarea = event.target.closest('textarea[data-comment-draft-textarea="true"]');
  if (!textarea) return;
  const form = textarea.closest('form');
  scheduleCommentDraftAutosave(form);
}, true);

document.addEventListener('change', (event) => {
  const input = event.target.closest('input[data-comment-draft-image-input="true"]');
  if (!input) return;
  const form = input.closest('form');
  const files = Array.from(input.files || []);
  input.value = '';
  if (files.length) queueCommentDraftImages(form, files, 'upload');
}, true);

document.addEventListener('paste', (event) => {
  const textarea = event.target.closest('textarea[data-comment-draft-textarea="true"]');
  if (!textarea) return;
  const imageFiles = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (!imageFiles.length) return;
  queueCommentDraftImages(textarea.closest('form'), imageFiles, 'paste');
}, true);

document.addEventListener('dragover', (event) => {
  const textarea = event.target.closest('textarea[data-comment-draft-textarea="true"]');
  if (!textarea) return;
  if (Array.from(event.dataTransfer?.items || []).some((item) => item.kind === 'file' && item.type.startsWith('image/'))) {
    event.preventDefault();
    textarea.classList.add('is-image-dragover');
  }
}, true);

document.addEventListener('dragleave', (event) => {
  event.target.closest('textarea[data-comment-draft-textarea="true"]')?.classList.remove('is-image-dragover');
}, true);

document.addEventListener('drop', (event) => {
  const textarea = event.target.closest('textarea[data-comment-draft-textarea="true"]');
  if (!textarea) return;
  const imageFiles = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith('image/'));
  textarea.classList.remove('is-image-dragover');
  if (!imageFiles.length) return;
  event.preventDefault();
  queueCommentDraftImages(textarea.closest('form'), imageFiles, 'upload');
}, true);

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'save-comment-draft') {
    event.preventDefault();
    event.stopImmediatePropagation();
    saveCommentDraftFromForm(trigger.closest('form'));
  } else if (action === 'delete-comment-draft') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = trigger.closest('form');
    const spec = commentDraftFormSpec(form);
    if (!spec) return;
    const draft = getCommentDraft(spec.key);
    if (draft && (draft.body.trim() || draft.attachments.length) && !window.confirm('Delete this saved comment draft?')) return;
    deleteCommentDraft(spec.key);
    const textarea = commentDraftTextarea(form, spec);
    if (textarea) textarea.value = '';
    updateCommentDraftStatus(form);
    renderCommentDraftImages(form);
    toast('Comment draft deleted.');
  } else if (action === 'remove-comment-draft-image') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = trigger.closest('form');
    const spec = commentDraftFormSpec(form);
    const draft = getCommentDraft(spec?.key);
    if (!spec || !draft) return;
    draft.attachments = normalizeAttachments(draft.attachments).filter((attachment) => attachment.id !== trigger.dataset.image);
    setCommentDraft(spec.key, {
      body: commentDraftTextarea(form, spec)?.value || draft.body,
      attachments: draft.attachments,
      context: draft.context || spec.context
    });
    renderCommentDraftImages(form);
    updateCommentDraftStatus(form);
    toast('Draft image removed.');
  } else if (action === 'close-modal' || action === 'modal-backdrop') {
    document.querySelectorAll('form[data-comment-draft-enhanced="true"]').forEach((form) => saveCommentDraftFromForm(form, { silent: true }));
  } else if (action === 'reset-demo') {
    clearAllCommentDrafts();
  }
}, true);

window.addEventListener('beforeunload', () => {
  document.querySelectorAll('form[data-comment-draft-enhanced="true"]').forEach((form) => saveCommentDraftFromForm(form, { silent: true }));
});

enhanceCommentDraftForms();
