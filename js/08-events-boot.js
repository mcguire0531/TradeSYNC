function handleClick(event) {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;

  if (action === 'go') {
    ui.drawerOpen = false;
    ui.modal = null;
    go(trigger.dataset.hash || '#home');
  } else if (action === 'open-drawer') {
    ui.drawerOpen = true;
    render();
  } else if (action === 'close-drawer') {
    ui.drawerOpen = false;
    render();
  } else if (action === 'select-building') {
    ui.selectedBuildingId = trigger.dataset.building;
    ui.roomPage = 1;
    go('#rooms');
  } else if (action === 'open-room') {
    ui.selectedRoomId = trigger.dataset.room;
    ensureRoomWorkspace(ui.selectedRoomId);
    go(`#room/${ui.selectedRoomId}`);
  } else if (action === 'room-page') {
    ui.roomPage = Number(trigger.dataset.page || 1);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (action === 'task-tab') {
    ui.taskTab = trigger.dataset.tab;
    render();
  } else if (action === 'task-view') {
    ui.taskView = trigger.dataset.view;
    render();
  } else if (action === 'complete-trade') {
    completeTrade(trigger.dataset.trade);
  } else if (action === 'reopen-trade') {
    reopenTrade(trigger.dataset.trade);
  } else if (action === 'open-add-building') {
    openModal('add-building');
  } else if (action === 'open-add-task') {
    openModal('add-task');
  } else if (action === 'open-add-inspection') {
    openModal('add-inspection');
  } else if (action === 'open-add-constraint') {
    openModal('add-constraint');
  } else if (action === 'open-inspection-trade') {
    ui.inspectionTrade = trigger.dataset.trade;
    go(`#inspections/${encodeURIComponent(ui.inspectionTrade)}`);
  } else if (action === 'inspection-comment') {
    openModal('inspection-comment', { inspectionId: trigger.dataset.inspection });
  } else if (action === 'toggle-constraint') {
    const item = data.constraints.find((constraint) => constraint.id === trigger.dataset.constraint);
    if (item) {
      item.status = item.status === 'active' ? 'resolved' : 'active';
      addActivity(item.status === 'resolved' ? 'complete' : 'progress', `${item.title} ${item.status === 'resolved' ? 'resolved' : 'reopened'}`);
      saveData();
      render();
      toast(`${item.title} ${item.status === 'resolved' ? 'resolved' : 'reopened'}.`);
    }
  } else if (action === 'constraint-filter') {
    ui.constraintFilter = trigger.dataset.filter;
    render();
  } else if (action === 'open-clashes') {
    ui.constraintFilter = 'moderate';
    go('#constraints');
  } else if (action === 'open-messages') {
    openModal('messages');
  } else if (action === 'open-notifications') {
    openModal('notifications');
  } else if (action === 'close-modal') {
    closeModal();
  } else if (action === 'modal-backdrop' && event.target === trigger) {
    closeModal();
  } else if (action === 'confirm-reset') {
    openModal('confirm-reset');
  } else if (action === 'reset-demo') {
    data = buildDemoData();
    saveData();
    ui.modal = null;
    ui.selectedRoomId = '205';
    ui.selectedBuildingId = 'riverside';
    ui.taskTradeFilter = 'all';
    ui.taskTab = 'all';
    go('#home');
    toast('TradeSYNC demo data was restored.');
  } else if (action === 'export-data') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradesync-demo-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast('TradeSYNC demo data downloaded.');
  } else if (action === 'install-app') {
    if (ui.installPrompt) {
      ui.installPrompt.prompt();
      ui.installPrompt.userChoice.finally(() => {
        ui.installPrompt = null;
        render();
      });
    }
  }
}

function handleChange(event) {
  const control = event.target.dataset.control;
  if (!control) return;
  if (control === 'room-filter') {
    ui.roomFilter = event.target.value;
    ui.roomPage = 1;
    render();
  } else if (control === 'task-trade-filter') {
    ui.taskTradeFilter = event.target.value;
    render();
  } else if (control === 'task-status') {
    updateTaskStatus(event.target.dataset.task, event.target.value);
    render();
    toast('Task status updated.');
  } else if (control === 'inspection-status') {
    updateInspectionStatus(event.target.dataset.inspection, event.target.value);
  } else if (control === 'inspection-detail-trade') {
    ui.inspectionTrade = event.target.value;
    go(`#inspections/${encodeURIComponent(ui.inspectionTrade)}`);
  } else if (control === 'inspection-room') {
    ui.selectedRoomId = event.target.value;
    ensureRoomWorkspace(ui.selectedRoomId);
    render();
  } else if (control === 'inspection-summary-trade' && event.target.value !== 'all') {
    ui.inspectionTrade = event.target.value;
    go(`#inspections/${encodeURIComponent(ui.inspectionTrade)}`);
  }
}

function handleInput(event) {
  if (event.target.dataset.control === 'room-search') {
    ui.roomSearch = event.target.value;
    ui.roomPage = 1;
    render();
    const search = document.querySelector('[data-control="room-search"]');
    if (search) {
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    }
  }
}

function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  if (form.id === 'add-building-form') {
    const images = ['assets/building-riverside.jpg', 'assets/building-maplewood.jpg', 'assets/building-westview.jpg', 'assets/building-pioneer.jpg'];
    const name = String(formData.get('name')).trim();
    data.buildings.push({
      id: slugify(name) || nextId('building'),
      name,
      address: String(formData.get('address')).trim(),
      dueDate: String(formData.get('dueDate')),
      progress: clamp(Number(formData.get('progress')) || 0, 0, 100),
      image: images[data.buildings.length % images.length]
    });
    saveData();
    closeModal();
    toast('Building added.');
  } else if (form.id === 'add-task-form') {
    const status = String(formData.get('status'));
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
    roomTasks().push(task);
    addActivity(status === 'complete' ? 'complete' : 'progress', `${task.trade} – ${task.title} added`);
    syncRoomProgress();
    saveData();
    closeModal();
    toast('Task added to the room.');
  } else if (form.id === 'add-inspection-form') {
    const status = String(formData.get('status'));
    const item = {
      id: nextId('i'),
      trade: String(formData.get('trade')),
      title: String(formData.get('title')).trim(),
      description: String(formData.get('description')).trim(),
      status,
      assignee: String(formData.get('assignee')).trim(),
      scheduled: String(formData.get('scheduled')),
      completed: status === 'not-inspected' ? null : dateOffset(0),
      comment: status === 'failed' ? 'Correction required. Add inspection details.' : ''
    };
    data.inspections.push(item);
    ui.inspectionTrade = item.trade;
    addActivity(status, `${item.trade} – ${item.title} added`);
    saveData();
    closeModal();
    go(`#inspections/${encodeURIComponent(item.trade)}`);
    toast('Inspection added.');
  } else if (form.id === 'add-constraint-form') {
    const item = {
      id: nextId('c'),
      title: String(formData.get('title')).trim(),
      type: String(formData.get('type')),
      priority: String(formData.get('priority')),
      status: 'active',
      description: String(formData.get('description')).trim(),
      startDate: String(formData.get('startDate')),
      endDate: String(formData.get('endDate')),
      owner: String(formData.get('owner')).trim()
    };
    data.constraints.unshift(item);
    addActivity('progress', `${item.title} added as a ${priorityLabel(item.priority)} constraint`);
    saveData();
    closeModal();
    toast('Constraint added.');
  } else if (form.id === 'inspection-comment-form') {
    const item = data.inspections.find((inspection) => inspection.id === String(formData.get('inspectionId')));
    if (item) {
      item.comment = String(formData.get('comment')).trim();
      saveData();
    }
    closeModal();
    toast('Inspection comment saved.');
  }
}

document.addEventListener('click', handleClick);
document.addEventListener('change', handleChange);
document.addEventListener('input', handleInput);
document.addEventListener('submit', handleSubmit);
window.addEventListener('hashchange', render);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (ui.modal) closeModal();
    else if (ui.drawerOpen) {
      ui.drawerOpen = false;
      render();
    }
  }
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  ui.installPrompt = event;
  if (route().view === 'more') render();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed.', error)));
}

if (!location.hash) location.hash = '#home';
else render();
