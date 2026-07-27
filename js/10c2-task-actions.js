async function addTaskFromEnhancedFormWithImages(formData) {
  try {
    const status = validCollaborationStatus(String(formData.get('status')));
    const attachments = await attachmentsFromForm(formData, 'taskCommentImages');
    const task = makeTask(
      nextId('t'),
      ui.selectedRoomId,
      String(formData.get('trade')),
      String(formData.get('title')).trim(),
      String(formData.get('description')).trim(),
      status,
      String(formData.get('assignee')).trim(),
      String(formData.get('dueDate')),
      status === 'complete' ? dateOffset(0) : null
    );
    task.comments = [];
    task.tradeStatus = status;
    task.turnerStatus = status;
    task.tradeCompletedDate = status === 'complete' ? dateOffset(0) : null;
    task.turnerCompletedDate = status === 'complete' ? dateOffset(0) : null;
    task.tradeUpdatedAt = dateOffset(0);
    task.turnerUpdatedAt = dateOffset(0);
    task.tradeUpdatedBy = CURRENT_USER;
    task.turnerUpdatedBy = CURRENT_USER;
    const initialComment = String(formData.get('comment') || '').trim();
    if (initialComment || attachments.length) {
      task.comments.push({ id: nextId('tc'), author: CURRENT_USER, body: initialComment, createdAt: new Date().toISOString(), attachments });
    }
    ensureTaskInterfaceState(task);
    const tasks = roomTasks();
    const activityLength = data.activity.length;
    tasks.push(task);
    addActivity(status === 'complete' ? 'complete' : 'progress', `${task.trade} – ${task.title} added to Trade View and Turner View`);
    syncRoomProgress(ui.selectedRoomId, false);
    if (!persistWithRollback(() => {
      const taskIndex = tasks.indexOf(task);
      if (taskIndex >= 0) tasks.splice(taskIndex, 1);
      data.activity.splice(activityLength);
      syncRoomProgress(ui.selectedRoomId, false);
    })) return;
    ui.modal = null;
    render();
    toast(initialComment || attachments.length ? 'Task and documentation added to both views.' : 'Task added to both views.');
  } catch (error) {
    console.warn('TradeSYNC could not add the task images.', error);
    toast(error.message || 'The task could not be added.');
  }
}

async function addTaskCommentFromFormWithImages(formData) {
  try {
    const task = findTask(String(formData.get('taskId')));
    const body = String(formData.get('body') || '').trim();
    const attachments = await attachmentsFromForm(formData, 'taskCommentImages');
    if (!task || (!body && !attachments.length)) {
      toast('Add a comment or at least one image.');
      return;
    }
    const comments = taskComments(task);
    const activityLength = data.activity.length;
    const comment = { id: nextId('tc'), author: CURRENT_USER, body, createdAt: new Date().toISOString(), attachments };
    comments.push(comment);
    addActivity('progress', `${task.trade} – documentation added to ${task.title}`);
    if (!persistWithRollback(() => {
      const commentIndex = comments.indexOf(comment);
      if (commentIndex >= 0) comments.splice(commentIndex, 1);
      data.activity.splice(activityLength);
    })) return;
    ui.modal = { type: 'task-comments', taskId: task.id };
    render();
    toast('Task documentation added and preserved.');
  } catch (error) {
    console.warn('TradeSYNC could not add the task comment.', error);
    toast(error.message || 'The comment could not be added.');
  }
}

addTaskFromEnhancedForm = addTaskFromEnhancedFormWithImages;
addCommentFromForm = addTaskCommentFromFormWithImages;
