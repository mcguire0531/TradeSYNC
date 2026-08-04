function p6CreateUndoBackup() {
  try {
    localStorage.setItem(P6_UNDO_STORAGE_KEY, JSON.stringify({
      createdAt: new Date().toISOString(),
      data
    }));
    return true;
  } catch (error) {
    console.warn('TradeSYNC could not create a P6 undo backup.', error);
    try { localStorage.removeItem(P6_UNDO_STORAGE_KEY); } catch (removeError) { console.warn(removeError); }
    return false;
  }
}

function p6HasUndoBackup() {
  try {
    return Boolean(localStorage.getItem(P6_UNDO_STORAGE_KEY));
  } catch (error) {
    return false;
  }
}

function p6UndoLastImport() {
  try {
    const raw = localStorage.getItem(P6_UNDO_STORAGE_KEY);
    if (!raw) throw new Error('No P6 import backup is available.');
    const backup = JSON.parse(raw);
    if (!backup?.data) throw new Error('The P6 import backup is invalid.');
    data = backup.data;
    p6NormalizeAppData(data);
    if (typeof normalizeReadinessWorkflowData === 'function') normalizeReadinessWorkflowData(data);
    if (typeof normalizePriorityProgressData === 'function') normalizePriorityProgressData(data);
    saveData();
    localStorage.removeItem(P6_UNDO_STORAGE_KEY);
    ui.modal = null;
    render();
    toast('The last P6 import was undone.');
    return true;
  } catch (error) {
    console.warn('TradeSYNC could not undo the P6 import.', error);
    toast(error.message || 'The last P6 import could not be undone.');
    return false;
  }
}

function p6MarkPriorRecordsNotCurrent(buildingId, projectKey) {
  Object.values(data.tasksByRoom || {}).flat().forEach((task) => {
    if (task.p6?.projectKey === projectKey) task.p6.current = false;
  });
  data.constraints.forEach((item) => { if (item.p6?.projectKey === projectKey && item.buildingId === buildingId) item.p6.current = false; });
  data.inspections.forEach((item) => { if (item.p6?.projectKey === projectKey && item.buildingId === buildingId) item.p6.current = false; });
  data.handoffs.forEach((item) => { if (item.p6?.projectKey === projectKey && item.buildingId === buildingId) item.p6.current = false; });
}
