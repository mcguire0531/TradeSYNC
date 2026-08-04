function p6SetImportStatus(form, message, tone = 'working') {
  const target = form?.querySelector('[data-p6-import-status]');
  if (!target) return;
  target.className = `p6-import-status field--full p6-import-status--${tone}`;
  target.innerHTML = `<span class="p6-import-status__dot"></span><span>${escapeHtml(message)}</span>`;
}

function p6SetImportProcessing(form, processing) {
  if (!form) return;
  form.dataset.processing = processing ? 'true' : 'false';
  form.closest('.modal')?.querySelectorAll('button, input, select').forEach((control) => {
    if (control.dataset.action === 'close-modal' && processing) control.disabled = true;
    else if (control.type !== 'hidden') control.disabled = processing;
  });
}

async function handleP6ImportForm(form, source = 'submit') {
  if (!form || form.dataset.processing === 'true') return;
  const fileInput = form.elements.p6File;
  const file = fileInput?.files?.[0];
  if (!file) {
    p6SetImportStatus(form, 'Choose a P6 file before importing.', 'error');
    return;
  }

  p6SetImportProcessing(form, true);
  p6SetImportStatus(form, `Reading ${file.name}...`, 'working');
  try {
    const schedule = await parseP6File(file);
    p6SetImportStatus(form, `Parsed ${schedule.stats.activities} activities. Updating TradeSYNC...`, 'working');
    const formData = new FormData(form);
    const options = p6ImportOptionsFromFormData(formData);
    const buildingId = String(formData.get('buildingId') || ui.selectedBuildingId || '');
    const summary = await applyP6Schedule(schedule, buildingId, file.name, options);
    ui.selectedBuildingId = buildingId;
    ui.modal = { type: 'p6-import-result', summary };
    render();
    toast(`P6 schedule synchronized: ${summary.activitiesRead} activities processed.`);
  } catch (error) {
    console.warn('TradeSYNC could not import the P6 schedule.', error);
    p6SetImportProcessing(form, false);
    p6SetImportStatus(form, error.message || 'The P6 schedule could not be imported.', 'error');
    toast(error.message || 'The P6 schedule could not be imported.');
  }
}

// Capture P6 controls before the existing generic handlers.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'open-p6-import') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('p6-import');
  } else if (action === 'download-p6-report') {
    event.preventDefault();
    event.stopImmediatePropagation();
    p6DownloadLastImportReport();
  } else if (action === 'confirm-p6-undo') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('p6-undo');
  } else if (action === 'undo-p6-import') {
    event.preventDefault();
    event.stopImmediatePropagation();
    p6UndoLastImport();
  }
}, true);

document.addEventListener('change', (event) => {
  if (event.target.id !== 'p6-file') return;
  event.stopImmediatePropagation();
  const form = event.target.closest('#p6-import-form');
  const file = event.target.files?.[0];
  const label = form?.querySelector('[data-p6-file-name]');
  if (label) label.textContent = file ? `${file.name} - ${Math.max(1, Math.round(file.size / 1024))} KB` : 'Maximum file size: 25 MB';
  p6SetImportStatus(form, file ? `${file.name} selected.` : 'Select a P6 schedule file to begin.', file ? 'ready' : 'working');
  if (file && form.elements.autoApply?.checked) window.setTimeout(() => handleP6ImportForm(form, 'auto'), 100);
}, true);

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'p6-import-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  handleP6ImportForm(event.target, 'submit');
}, true);

if (['home', 'room', 'tasks', 'more'].includes(route().view)) render();
