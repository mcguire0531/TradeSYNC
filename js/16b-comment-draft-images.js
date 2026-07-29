'use strict';

/* Draft image processing and form enhancement. */

function setCommentDraftProcessing(form, processing, message = '') {
  if (!form) return;
  form.dataset.commentDraftProcessing = processing ? 'true' : 'false';
  const modal = form.closest('.modal');
  modal?.querySelectorAll('button[type="submit"], [data-action="save-comment-draft"]').forEach((button) => {
    button.disabled = processing;
  });
  updateCommentDraftStatus(form, processing ? (message || 'Preparing images...') : '');
}

function queueCommentDraftImages(form, files, sourceLabel) {
  const spec = commentDraftFormSpec(form);
  if (!spec || !files.length) return Promise.resolve();
  const requestedFiles = files.slice();
  const previous = commentDraftPendingImages.get(spec.key) || Promise.resolve();
  const pending = previous.then(async () => {
    setCommentDraftProcessing(form, true, sourceLabel === 'paste' ? 'Preparing pasted screenshot...' : 'Preparing images...');
    const attachments = normalizeAttachments(getCommentDraft(spec.key)?.attachments);
    const available = Math.max(0, COLLABORATION_MAX_IMAGES - attachments.length);
    if (!available) {
      toast(`A comment can include up to ${COLLABORATION_MAX_IMAGES} images.`);
      setCommentDraftProcessing(form, false);
      return;
    }
    const selected = requestedFiles.slice(0, available);
    if (selected.length < requestedFiles.length) {
      toast(`Only ${selected.length} image${selected.length === 1 ? '' : 's'} were added because the limit is ${COLLABORATION_MAX_IMAGES}.`);
    }
    for (const file of selected) {
      const attachment = await compressImageFile(file);
      attachments.push(attachment);
    }
    const saved = setCommentDraft(spec.key, {
      body: commentDraftTextarea(form, spec)?.value || '',
      attachments,
      context: spec.context
    });
    renderCommentDraftImages(form);
    setCommentDraftProcessing(form, false);
    if (saved) toast(sourceLabel === 'paste' ? 'Screenshot attached to the draft.' : 'Images attached to the draft.');
  }).catch((error) => {
    console.warn('TradeSYNC could not prepare the comment image.', error);
    setCommentDraftProcessing(form, false);
    toast(error.message || 'The image could not be attached.');
  }).finally(() => {
    if (commentDraftPendingImages.get(spec.key) === pending) commentDraftPendingImages.delete(spec.key);
  });
  commentDraftPendingImages.set(spec.key, pending);
  return pending;
}

function enhanceCommentDraftForm(form) {
  if (!form || form.dataset.commentDraftEnhanced === 'true') return;
  const spec = commentDraftFormSpec(form);
  const textarea = commentDraftTextarea(form, spec);
  if (!spec || !textarea) return;
  form.dataset.commentDraftEnhanced = 'true';
  commentDraftHiddenInput(form, spec);
  textarea.dataset.commentDraftTextarea = 'true';
  textarea.setAttribute('autocomplete', 'off');

  const existingDraft = getCommentDraft(spec.key);
  if (existingDraft && !textarea.value.trim()) textarea.value = existingDraft.body;

  const field = textarea.closest('.field') || textarea.parentElement;
  if (field && !field.querySelector('.comment-paste-help')) {
    const help = document.createElement('div');
    help.className = 'field-help comment-paste-help';
    help.innerHTML = `${icon('upload')} Paste a screenshot into this text box, or use Choose Images below.`;
    field.appendChild(help);
  }

  form.insertAdjacentHTML('beforeend', commentDraftWorkspaceMarkup());
  const fileInput = form.querySelector(`input[type="file"][name="${spec.imageName}"]`);
  if (fileInput) {
    fileInput.dataset.commentDraftImageInput = 'true';
    const label = fileInput.closest('.image-upload-control')?.querySelector('span');
    if (label) label.textContent = 'Choose images or screenshots';
  }

  const footer = form.closest('.modal')?.querySelector('.modal__footer');
  const submitButton = footer?.querySelector(`button[type="submit"][form="${form.id}"]`);
  if (submitButton && form.id !== 'add-task-form') submitButton.innerHTML = `${icon('comment')}Submit Comment`;

  updateCommentDraftStatus(form);
  renderCommentDraftImages(form);
}

function decorateSavedDraftIndicators() {
  const mappings = [
    ['[data-action="open-task-comments"][data-task]', (button) => `task-comment:${button.dataset.task}`],
    ['[data-action="inspection-comment"][data-inspection]', (button) => `inspection-comment:${button.dataset.inspection}`],
    ['[data-action="open-constraint"][data-constraint]', (button) => `constraint-comment:${button.dataset.constraint}`]
  ];
  mappings.forEach(([selector, keyFor]) => {
    document.querySelectorAll(selector).forEach((button) => {
      const key = keyFor(button);
      const draft = getCommentDraft(key);
      const existing = button.querySelector('.comment-draft-indicator');
      if (draft && (draft.body.trim() || draft.attachments.length)) {
        if (!existing) button.insertAdjacentHTML('beforeend', '<span class="comment-draft-indicator">Draft</span>');
      } else {
        existing?.remove();
      }
    });
  });
}

function enhanceCommentDraftForms() {
  document.querySelectorAll('form').forEach(enhanceCommentDraftForm);
  decorateSavedDraftIndicators();
}

render = function renderWithCommentDraftSupport() {
  const result = commentDraftRenderBase();
  enhanceCommentDraftForms();
  return result;
};

attachmentsFromForm = async function attachmentsFromFormWithDraftImages(formData, fieldName) {
  const key = String(formData.get('commentDraftKey') || '');
  const pending = key ? commentDraftPendingImages.get(key) : null;
  if (pending) await pending;
  const uploaded = await commentDraftAttachmentsFromFormBase(formData, fieldName);
  const stored = key ? normalizeAttachments(getCommentDraft(key)?.attachments) : [];
  const combined = [];
  const seen = new Set();
  [...stored, ...uploaded].forEach((attachment) => {
    const normalized = normalizeAttachment(attachment);
    if (!normalized) return;
    const identity = normalized.dataUrl;
    if (seen.has(identity)) return;
    seen.add(identity);
    combined.push(normalized);
  });
  if (combined.length > COLLABORATION_MAX_IMAGES) {
    throw new Error(`Choose no more than ${COLLABORATION_MAX_IMAGES} images for one comment.`);
  }
  return combined;
};
