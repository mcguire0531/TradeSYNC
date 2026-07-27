updateTaskStatus = function updateTaskStatusByInterface(taskId, status) {
  const task = findTask(taskId);
  if (!task) return;
  const view = activeTaskInterface();
  setTaskStatusForView(task, status, view);
  addActivity(status === 'complete' ? 'complete' : 'progress', `${task.trade} – ${task.title} changed to ${taskStatusLabel(status)} in ${taskInterfaceLabel(view)}`);
  syncRoomProgress();
  saveData();
};

completeTrade = function completeTradeByInterface(tradeName) {
  const view = activeTaskInterface();
  const tasks = roomTasks().filter((task) => task.trade === tradeName);
  tasks.forEach((task) => setTaskStatusForView(task, 'complete', view));
  addActivity('complete', `${tradeName} marked Room ${selectedRoom().number} complete in ${taskInterfaceLabel(view)}`);
  syncRoomProgress();
  saveData();
  render();
  const conflicts = tradeStatusClashCount(tradeName);
  toast(`${tradeName} is 100% complete in ${taskInterfaceLabel(view)}.${conflicts ? ` ${conflicts} clash${conflicts === 1 ? '' : 'es'} need review.` : ''}`);
};

reopenTrade = function reopenTradeByInterface(tradeName) {
  const view = activeTaskInterface();
  const tasks = roomTasks().filter((task) => task.trade === tradeName);
  const last = tasks[tasks.length - 1];
  if (last) setTaskStatusForView(last, 'in-progress', view);
  addActivity('progress', `${tradeName} reopened in Room ${selectedRoom().number} in ${taskInterfaceLabel(view)}`);
  syncRoomProgress();
  saveData();
  render();
  toast(`${tradeName} was reopened in ${taskInterfaceLabel(view)}.`);
};

updateInspectionStatus = function updateInspectionStatusWithoutDeletingComments(inspectionId, status) {
  const item = data.inspections.find((inspection) => inspection.id === inspectionId);
  if (!item) return;
  inspectionCommentHistory(item);
  item.status = status;
  item.completed = status === 'not-inspected' ? null : dateOffset(0);
  // Documentation is intentionally never cleared when an inspection passes.
  if (status === 'failed' && !item.commentHistory.length) {
    item.commentHistory.push({
      id: nextId('ic'),
      author: CURRENT_USER,
      body: 'Correction required. Add a detailed comment before reinspection.',
      createdAt: new Date().toISOString(),
      attachments: []
    });
    item.comment = item.commentHistory[0].body;
  }
  addActivity(status, `${item.trade} – ${item.title} ${status === 'not-inspected' ? 'reset to Not Inspected' : status}`);
  saveData();
  render();
  if (status === 'failed') openModal('inspection-comment', { inspectionId });
};
