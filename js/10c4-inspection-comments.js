function renderInspectionCommentModal() {
  const item = data.inspections.find((inspection) => inspection.id === ui.modal?.inspectionId);
  if (!item) return '';
  const comments = inspectionCommentHistory(item);
  const body = `
    <div class="task-comment-context"><div class="trade-cell">${tradeIcon(item.trade)}<div><div class="strong">${escapeHtml(item.title)}</div><div class="small muted">${escapeHtml(item.trade)} · Inspection documentation</div></div></div>${inspectionStatusMarkup(item.status)}</div>
    ${renderDocumentationThread(comments, 'No inspection comments yet.', 'Add a note or image for the inspection record.')}
    <form id="inspection-comment-form" class="task-comment-form form-grid">
      <input type="hidden" name="inspectionId" value="${escapeHtml(item.id)}" />
      <div class="field field--full"><label for="inspection-comment-body">Add comment</label><textarea class="textarea" id="inspection-comment-body" name="comment" placeholder="Describe the condition, correction, or acceptance note"></textarea></div>
      ${renderImageUploadField({ id: 'inspection-comment-images', name: 'inspectionCommentImages', label: 'Add inspection images' })}
    </form>`;
  return modalShell(`Inspection Comments (${comments.length})`, body, `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="submit" form="inspection-comment-form">${icon('comment')}Add Documentation</button>`);
}

async function addInspectionCommentFromForm(formData) {
  try {
    const item = data.inspections.find((inspection) => inspection.id === String(formData.get('inspectionId')));
    const body = String(formData.get('comment') || '').trim();
    const attachments = await attachmentsFromForm(formData, 'inspectionCommentImages');
    if (!item || (!body && !attachments.length)) {
      toast('Add a comment or at least one image.');
      return;
    }
    const comments = inspectionCommentHistory(item);
    const previousComment = item.comment;
    const comment = { id: nextId('ic'), author: CURRENT_USER, body, createdAt: new Date().toISOString(), attachments };
    comments.push(comment);
    item.comment = body || 'Image documentation added.';
    if (!persistWithRollback(() => {
      comments.splice(comments.indexOf(comment), 1);
      item.comment = previousComment;
    })) return;
    ui.modal = { type: 'inspection-comment', inspectionId: item.id };
    render();
    toast('Inspection documentation added and preserved.');
  } catch (error) {
    console.warn('TradeSYNC could not add the inspection comment.', error);
    toast(error.message || 'The inspection comment could not be added.');
  }
}
