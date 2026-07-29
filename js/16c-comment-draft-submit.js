'use strict';

/* Submit saved drafts and clear them only after a successful comment. */

function saveDraftFromSubmittedFormData(formData, context = '') {
  const key = String(formData.get('commentDraftKey') || '');
  if (!key) return '';
  const body = String(formData.get('body') || formData.get('comment') || '');
  const existing = getCommentDraft(key);
  setCommentDraft(key, {
    body,
    attachments: normalizeAttachments(existing?.attachments),
    context: context || existing?.context || ''
  });
  return key;
}

addTaskFromEnhancedForm = async function addTaskFromEnhancedFormWithDraftCleanup(formData) {
  const key = saveDraftFromSubmittedFormData(formData, 'New task initial comment');
  const before = roomTasks().length;
  await commentDraftAddTaskBase(formData);
  if (roomTasks().length > before) deleteCommentDraft(key);
};

addCommentFromForm = async function addTaskCommentFromFormWithDraftCleanup(formData) {
  const key = saveDraftFromSubmittedFormData(formData, 'Task comment');
  const task = findTask(String(formData.get('taskId') || ''));
  const before = task ? taskComments(task).length : 0;
  await commentDraftAddTaskCommentBase(formData);
  const after = task ? taskComments(task).length : before;
  if (after > before) {
    deleteCommentDraft(key);
    render();
  }
};

addInspectionCommentFromForm = async function addInspectionCommentFromFormWithDraftCleanup(formData) {
  const key = saveDraftFromSubmittedFormData(formData, 'Inspection comment');
  const item = data.inspections.find((inspection) => inspection.id === String(formData.get('inspectionId') || ''));
  const before = item ? inspectionCommentHistory(item).length : 0;
  await commentDraftAddInspectionCommentBase(formData);
  const after = item ? inspectionCommentHistory(item).length : before;
  if (after > before) {
    deleteCommentDraft(key);
    render();
  }
};

addConstraintCommentFromForm = async function addConstraintCommentFromFormWithDraftCleanup(formData) {
  const key = saveDraftFromSubmittedFormData(formData, 'Constraint comment');
  const item = data.constraints.find((constraint) => constraint.id === String(formData.get('constraintId') || ''));
  const before = item ? constraintComments(item).length : 0;
  await commentDraftAddConstraintCommentBase(formData);
  const after = item ? constraintComments(item).length : before;
  if (after > before) {
    deleteCommentDraft(key);
    render();
  }
};
