function renderP6ImportModal() {
  const building = selectedBuilding() || data.buildings[0];
  const settings = data.p6Settings || {};
  return modalShell('Upload Primavera P6 Schedule', `
    <form id="p6-import-form" class="form-grid p6-import-form">
      <div class="field field--full p6-import-intro"><span>${icon('calendar')}</span><div><strong>Automatic schedule synchronization</strong><small>After the file is selected, TradeSYNC can automatically apply it to the selected building. Existing comments and field documentation are preserved.</small></div></div>
      <div class="field field--full"><label for="p6-building">Target building</label><select class="select" id="p6-building" name="buildingId">${data.buildings.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === building?.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select><div class="field-help">All imported activities are scoped to this building. The P6 planned finish updates the building due date.</div></div>
      <div class="field field--full"><label for="p6-file">Primavera file</label><label class="p6-file-drop" for="p6-file">${icon('upload')}<span><strong>Choose XER, PMXML/XML, or CSV</strong><small data-p6-file-name>Maximum file size: 25 MB</small></span><input id="p6-file" name="p6File" type="file" accept=".xer,.xml,.pmxml,.csv,.txt,text/plain,application/xml,text/xml" required /></label></div>
      <div class="field field--full"><label class="readiness-checkbox"><input type="checkbox" name="autoApply" value="true" checked /><span><strong>Automatically sync after file selection</strong><small>The import starts as soon as a valid file is selected. Clear this option to review settings and use the button below.</small></span></label></div>
      <details class="p6-import-options field--full">
        <summary>Import behavior</summary>
        <div class="p6-import-options__grid">
          <label class="readiness-checkbox"><input type="checkbox" name="updateTurnerActuals" value="true" ${settings.updateTurnerActuals !== false ? 'checked' : ''} /><span><strong>Update Turner status from P6 actuals</strong><small>Actual starts, finishes, and percent complete update Turner View only. Trade View stays independent.</small></span></label>
          <label class="readiness-checkbox"><input type="checkbox" name="createConstraints" value="true" ${settings.createConstraints !== false ? 'checked' : ''} /><span><strong>Create schedule constraints</strong><small>Critical, overdue, and low-float activities update the Constraints page.</small></span></label>
          <label class="readiness-checkbox"><input type="checkbox" name="createInspectionGates" value="true" ${settings.createInspectionGates !== false ? 'checked' : ''} /><span><strong>Create readiness gates</strong><small>Inspection, test, commissioning, and turnover activities update Inspections.</small></span></label>
          <label class="readiness-checkbox"><input type="checkbox" name="createHandoffs" value="true" ${settings.createHandoffs !== false ? 'checked' : ''} /><span><strong>Create explicit handoffs</strong><small>P6 activities named as handoffs or trade releases update the handoff workflow.</small></span></label>
          <label class="readiness-checkbox"><input type="checkbox" name="createUnassignedLocation" value="true" ${settings.createUnassignedLocation !== false ? 'checked' : ''} /><span><strong>Keep unmatched trade activities</strong><small>Recognized trade activities without a room are placed in a P6 Unassigned Schedule location.</small></span></label>
        </div>
      </details>
      <div class="p6-import-status field--full" data-p6-import-status aria-live="polite"><span class="p6-import-status__dot"></span><span>Select a P6 schedule file to begin.</span></div>
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="p6-import-form">${icon('upload')}Upload and Sync</button>`);
}

function renderP6ImportResultModal() {
  const summary = ui.modal?.summary || p6LastImport();
  if (!summary) return '';
  const totalTaskUpdates = summary.tasksCreated + summary.tasksUpdated;
  const body = `
    <div class="p6-result-header"><span>${icon('check')}</span><div><strong>P6 schedule synchronized</strong><small>${escapeHtml(summary.projectName || summary.fileName)} to ${escapeHtml(summary.buildingName)}</small></div></div>
    <div class="p6-result-grid"><div><strong>${summary.activitiesRead}</strong><span>Activities read</span></div><div><strong>${totalTaskUpdates}</strong><span>Tasks updated</span></div><div><strong>${summary.constraintsCreatedOrUpdated}</strong><span>Constraints</span></div><div><strong>${summary.inspectionsCreatedOrUpdated}</strong><span>Readiness gates</span></div><div><strong>${summary.handoffsCreatedOrUpdated}</strong><span>Handoffs</span></div><div><strong>${summary.unmatchedActivities}</strong><span>Schedule-only</span></div></div>
    <div class="p6-result-details"><div><span>File</span><strong>${escapeHtml(summary.fileName)}</strong></div><div><span>Format</span><strong>${escapeHtml(summary.format)}</strong></div><div><span>Data Date</span><strong>${summary.dataDate ? formatDate(p6DateOnly(summary.dataDate)) : 'Not provided'}</strong></div><div><span>Building Finish</span><strong>${summary.plannedFinish ? formatDate(p6DateOnly(summary.plannedFinish)) : 'Unchanged'}</strong></div></div>
    ${summary.warnings?.length ? `<section class="p6-result-warnings"><strong>Import notes</strong><ul>${summary.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></section>` : ''}
    <p class="p6-result-copy">Home, Rooms, Tasks, progress, readiness, Constraints, Inspections, handoffs, notifications, and due dates were recalculated from the imported schedule.</p>`;
  return modalShell('P6 Import Complete', body, `<button class="button button--secondary" type="button" data-action="download-p6-report">Import Report</button>${p6HasUndoBackup() ? '<button class="button button--ghost" type="button" data-action="confirm-p6-undo">Undo Import</button>' : ''}<button class="button button--primary" type="button" data-action="close-modal">Done</button>`);
}

function renderP6UndoModal() {
  return modalShell('Undo Last P6 Import?', `<div class="remove-building-warning">${icon('alert')}<div><strong>Restore the app to its state before the last P6 import?</strong><p>This removes the most recent schedule-created changes while restoring the prior tasks, dates, constraints, gates, handoffs, progress, and notifications. Later manual edits made after the import will also be rolled back.</p></div></div>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--danger" type="button" data-action="undo-p6-import">Undo Last Import</button>`);
}

renderModal = function renderModalWithP6Import() {
  if (!ui.modal) return '';
  if (ui.modal.type === 'p6-import') return renderP6ImportModal();
  if (ui.modal.type === 'p6-import-result') return renderP6ImportResultModal();
  if (ui.modal.type === 'p6-undo') return renderP6UndoModal();
  return p6RenderModalBase();
};
