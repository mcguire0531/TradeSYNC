function toggleConstraintFromDetail(constraintId) {
  const item = data.constraints.find((constraint) => constraint.id === constraintId);
  if (!item) return;
  item.status = item.status === 'active' ? 'resolved' : 'active';
  addActivity(item.status === 'resolved' ? 'complete' : 'progress', `${item.title} ${item.status === 'resolved' ? 'resolved' : 'reopened'}`);
  saveData();
  ui.modal = { type: 'constraint-detail', constraintId: item.id };
  render();
  toast(`${item.title} ${item.status === 'resolved' ? 'resolved' : 'reopened'}. Documentation was preserved.`);
}

// Capture new collaboration-specific clicks before the original handlers.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'open-clashes') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('clashes');
  } else if (action === 'open-constraint') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('constraint-detail', { constraintId: trigger.dataset.constraint });
  } else if (action === 'toggle-constraint-from-detail') {
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleConstraintFromDetail(trigger.dataset.constraint);
  }
}, true);

// A task status change applies only to the interface currently open.
document.addEventListener('change', (event) => {
  if (event.target.dataset.control !== 'task-status') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  updateTaskStatus(event.target.dataset.task, event.target.value);
  render();
  const task = findTask(event.target.dataset.task);
  const conflict = task && taskHasStatusClash(task);
  toast(`Task status updated in ${taskInterfaceLabel()}.${conflict ? ' A clash was recorded because the two views disagree.' : ''}`);
}, true);

// Constraint and inspection documentation forms need asynchronous image handling.
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'add-constraint-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    addConstraintFromForm(new FormData(form));
  } else if (form.id === 'inspection-comment-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    addInspectionCommentFromForm(new FormData(form));
  } else if (form.id === 'constraint-comment-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    addConstraintCommentFromForm(new FormData(form));
  }
}, true);

// Keep the current page synchronized after the migration and function overrides.
if (route().view === 'tasks' || route().view === 'constraints' || route().view === 'inspections') render();
