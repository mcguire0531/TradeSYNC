'use strict';

renderTradeTaskModal = function renderTradeTaskModalByInterface() {
  const tradeName = ui.modal?.trade;
  const room = selectedRoom();
  const trade = roomTrades().find((item) => item.name === tradeName);
  if (!trade) return '';
  const tasks = roomTasks().filter((task) => task.trade === tradeName);
  const taskList = tasks.length
    ? `<div class="trade-task-modal-list">${tasks.map((task) => `
        <article class="trade-task-modal-item ${taskHasStatusClash(task) ? 'task-row--clash' : ''}">
          <div class="trade-task-modal-item__top"><div><div class="strong">${escapeHtml(task.title)} ${renderTaskClashBadge(task, true)}</div><div class="small muted">${escapeHtml(task.description)}</div></div>${taskStatusMarkup(taskStatusForView(task))}</div>
          <div class="trade-task-modal-item__meta"><span>Assigned to ${escapeHtml(task.assignee)}</span><span>Due ${formatDate(task.dueDate)}</span>${renderTaskCommentButton(task, true)}</div>
        </article>`).join('')}</div>`
    : `<div class="empty-state"><div class="empty-state__icon">${icon('tasks')}</div><strong>No ${escapeHtml(tradeName)} tasks in this room yet.</strong><p class="muted small no-margin">Add the first task. It will appear in both interfaces.</p></div>`;

  const body = `<div class="trade-task-modal-summary">${tradeIcon(tradeName)}<div><div class="strong">${escapeHtml(taskInterfaceLabel())} · Room ${escapeHtml(room.number)} · ${escapeHtml(room.name)}</div><div class="small muted">${trade.complete} of ${trade.total} tasks complete · ${trade.percent}%${trade.conflicts ? ` · ${trade.conflicts} clash${trade.conflicts === 1 ? '' : 'es'}` : ''}</div></div></div>${makeProgress(trade.percent, trade.status === 'complete' ? 'var(--green)' : trade.status === 'in-progress' ? 'var(--orange)' : '#dfe4ee')}${taskList}`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="button" data-action="open-add-task" data-trade="${escapeHtml(tradeName)}">${icon('plus')}Add ${escapeHtml(tradeName)} Task</button>`;
  return modalShell(`${tradeName} Tasks`, body, footer);
};

renderEnhancedAddTaskModal = function renderEnhancedAddTaskModalWithImages() {
  const preferredTrade = ui.modal?.trade || ui.taskTradeFilter;
  const selectedTrade = preferredTrade && preferredTrade !== 'all' ? preferredTrade : TRADE_META[0].name;
  return modalShell(`Add Task to Room ${selectedRoom().number}`, `
    <form id="add-task-form" class="form-grid">
      <div class="field field--full"><label for="task-title">Task</label><input class="input" id="task-title" name="title" required placeholder="Describe the work to complete" /></div>
      <div class="field field--full"><label for="task-description">Details</label><textarea class="textarea" id="task-description" name="description" required placeholder="Scope, location, and acceptance criteria"></textarea></div>
      <div class="field"><label for="task-trade">Trade</label><select class="select" id="task-trade" name="trade">${TRADE_META.map((trade) => `<option value="${escapeHtml(trade.name)}" ${trade.name === selectedTrade ? 'selected' : ''}>${escapeHtml(trade.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="task-assignee">Assignee</label><input class="input" id="task-assignee" name="assignee" required value="${escapeHtml(TRADE_META.find((trade) => trade.name === selectedTrade)?.assignee || CURRENT_USER)}" /></div>
      <div class="field"><label for="task-status">Starting status for both views</label><select class="select" id="task-status" name="status"><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="complete">Complete</option></select></div>
      <div class="field"><label for="task-due">Due date</label><input class="input" id="task-due" name="dueDate" type="date" required value="${dateOffset(7)}" /></div>
      <div class="field field--full"><label for="task-initial-comment">Initial comment <span class="muted">(optional)</span></label><textarea class="textarea" id="task-initial-comment" name="comment" placeholder="Add a coordination note, question, or instruction for this task"></textarea><div class="field-help">This comment remains attached to the task after completion and is visible in both interfaces.</div></div>
      ${renderImageUploadField({ id: 'task-initial-images', name: 'taskCommentImages', label: 'Images for the initial comment' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-task-form">Add Task to Both Views</button>`);
};

renderTaskCommentsModal = function renderTaskCommentsModalWithImages() {
  const task = findTask(ui.modal?.taskId);
  if (!task) return '';
  const comments = taskComments(task);
  const body = `
    <div class="task-comment-context">
      <div class="trade-cell">${tradeIcon(task.trade)}<div><div class="strong">${escapeHtml(task.title)}</div><div class="small muted">${escapeHtml(task.trade)} · Room ${escapeHtml(task.roomId)} · Shared documentation</div></div></div>
      <div class="comment-status-stack">${taskStatusMarkup(taskStatusForView(task))}${renderTaskClashBadge(task)}</div>
    </div>
    ${renderDocumentationThread(comments, 'No comments yet.', 'Add the first coordination note or image for this task.')}
    <form id="task-comment-form" class="task-comment-form form-grid">
      <input type="hidden" name="taskId" value="${escapeHtml(task.id)}" />
      <div class="field field--full"><label for="task-comment-body">Add comment</label><textarea class="textarea" id="task-comment-body" name="body" placeholder="Type a comment, question, or update"></textarea></div>
      ${renderImageUploadField({ id: 'task-comment-images', name: 'taskCommentImages', label: 'Add images to this comment' })}
    </form>`;
  return modalShell(`Task Comments (${comments.length})`, body, `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="submit" form="task-comment-form">${icon('comment')}Add Documentation</button>`);
};

