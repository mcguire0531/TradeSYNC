'use strict';

/* UI and mapping enhancements for PDF / Excel / document schedule imports. */

const smartScheduleRenderP6SchedulePanelBase = renderP6SchedulePanel;
const smartScheduleP6ActivitySearchTextBase = p6ActivitySearchText;
const smartScheduleP6DetectTradeBase = p6DetectTrade;
const smartScheduleP6DetectAllTradesBase = p6DetectAllTrades;
const smartScheduleP6UpsertTaskBase = p6UpsertTask;

p6ActivitySearchText = function p6ActivitySearchTextWithDocumentFields(activity) {
  return [
    smartScheduleP6ActivitySearchTextBase(activity),
    activity?.declaredTrade,
    activity?.declaredRoom,
    activity?.declaredLocation,
    activity?.responsibleParty,
    activity?.sourceLabel,
    activity?.sourceDocument
  ].filter(Boolean).join(' | ').toLowerCase();
};

p6DetectTrade = function p6DetectTradeWithExplicitDocumentTrade(activity) {
  return smartNormalizeTrade(activity?.declaredTrade) || smartScheduleP6DetectTradeBase(activity);
};

p6DetectAllTrades = function p6DetectAllTradesWithExplicitDocumentTrade(activity) {
  const explicit = smartNormalizeTrade(activity?.declaredTrade);
  const inferred = smartScheduleP6DetectAllTradesBase(activity);
  return explicit ? [explicit, ...inferred.filter((trade) => trade !== explicit)] : inferred;
};

p6UpsertTask = function p6UpsertTaskWithResponsibleParty(activity, context) {
  const result = smartScheduleP6UpsertTaskBase(activity, context);
  const responsible = String(activity?.responsibleParty || activity?.resourceNames?.[0] || '').trim();
  if (responsible) {
    result.task.assignee = responsible;
    result.task.p6 = {
      ...(result.task.p6 || {}),
      responsibleParty: responsible,
      declaredTrade: activity.declaredTrade || '',
      declaredRoom: activity.declaredRoom || '',
      sourceDocument: activity.sourceDocument || context.fileName,
      sourceLabel: activity.sourceLabel || '',
      sourceRow: activity.sourceRow || null,
      importConfidence: activity.importConfidence || 'medium'
    };
  }
  return result;
};

renderP6SchedulePanel = function renderSmartSchedulePanel() {
  return smartScheduleRenderP6SchedulePanelBase()
    .replace('Primavera P6 Schedule Sync', 'Schedule & P6 Document Sync')
    .replace('Connect the project schedule', 'Connect a P6, Excel, or PDF schedule')
    .replace('Upload an XER, PMXML/XML, or P6 CSV export.', 'Upload P6, Excel, CSV, JSON, or a searchable PDF schedule.')
    .replace('Upload P6 File', 'Upload Schedule File');
};

function renderSmartScheduleFileTypes() {
  return `
    <div class="smart-schedule-file-types" aria-label="Supported schedule file types">
      <span>PDF</span><span>XLSX</span><span>XLS</span><span>ODS</span><span>XER</span><span>PMXML</span><span>XML</span><span>CSV</span><span>TSV</span><span>JSON</span>
    </div>`;
}

renderP6ImportModal = function renderP6ImportModalWithPdfAndExcel() {
  const building = selectedBuilding() || data.buildings[0];
  const settings = data.p6Settings || {};
  return modalShell('Upload Schedule or P6 File', `
    <form id="p6-import-form" class="form-grid p6-import-form">
      <div class="field field--full p6-import-intro"><span>${icon('calendar')}</span><div><strong>Smart schedule synchronization</strong><small>TradeSYNC reads the schedule, identifies the trade or responsible company, matches rooms and areas, and sends each record to Tasks, Constraints, Inspections, readiness gates, or handoffs.</small></div></div>
      ${renderSmartScheduleFileTypes()}
      <div class="field field--full"><label for="p6-building">Target building</label><select class="select" id="p6-building" name="buildingId">${data.buildings.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === building?.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select><div class="field-help">The imported schedule is scoped to this building. A project finish date can update the building due date.</div></div>
      <div class="field field--full"><label for="p6-file">Schedule file</label><label class="p6-file-drop smart-schedule-file-drop" for="p6-file">${icon('upload')}<span><strong>Choose PDF, Excel, P6, or data file</strong><small data-p6-file-name>PDFs must contain selectable/searchable text. Maximum file size: 35 MB.</small></span><input id="p6-file" name="p6File" type="file" accept=".pdf,.xlsx,.xls,.xlsm,.xlsb,.ods,.fods,.slk,.dif,.dbf,.prn,.xer,.xml,.pmxml,.csv,.tsv,.json,.txt,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/xml,text/xml,text/csv,text/tab-separated-values,application/json" required /></label></div>
      <div class="smart-schedule-reader-note field--full">${icon('search')}<span><strong>What the reader looks for</strong><small>Activity or task, trade, responsible person/company, room, wing, floor, start, finish, status, percent complete, predecessors, inspections, blockers, and handoffs.</small></span></div>
      <div class="field field--full"><label class="readiness-checkbox"><input type="checkbox" name="autoApply" value="true" checked /><span><strong>Automatically sync after file selection</strong><small>Clear this option to review the import behavior before pressing Upload and Sync.</small></span></label></div>
      <details class="p6-import-options field--full">
        <summary>Import behavior</summary>
        <div class="p6-import-options__grid">
          <label class="readiness-checkbox"><input type="checkbox" name="updateTurnerActuals" value="true" ${settings.updateTurnerActuals !== false ? 'checked' : ''} /><span><strong>Update Turner status from schedule actuals</strong><small>Actual starts, finishes, and progress update Turner View only. Trade View stays independent.</small></span></label>
          <label class="readiness-checkbox"><input type="checkbox" name="createConstraints" value="true" ${settings.createConstraints !== false ? 'checked' : ''} /><span><strong>Create schedule constraints</strong><small>Critical, overdue, blocked, and low-float work can update Constraints.</small></span></label>
          <label class="readiness-checkbox"><input type="checkbox" name="createInspectionGates" value="true" ${settings.createInspectionGates !== false ? 'checked' : ''} /><span><strong>Create readiness gates</strong><small>Inspection, testing, commissioning, and turnover activities update Inspections.</small></span></label>
          <label class="readiness-checkbox"><input type="checkbox" name="createHandoffs" value="true" ${settings.createHandoffs !== false ? 'checked' : ''} /><span><strong>Create explicit handoffs</strong><small>Handoff, trade release, and ready-for-next-trade activities update handoffs.</small></span></label>
          <label class="readiness-checkbox"><input type="checkbox" name="createUnassignedLocation" value="true" ${settings.createUnassignedLocation !== false ? 'checked' : ''} /><span><strong>Keep unmatched trade activities</strong><small>Recognized work without a room is retained in the P6 Unassigned Schedule location instead of being discarded.</small></span></label>
        </div>
      </details>
      <div class="p6-import-status field--full" data-p6-import-status aria-live="polite"><span class="p6-import-status__dot"></span><span>Select a schedule file to begin.</span></div>
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="p6-import-form">${icon('upload')}Upload and Sync</button>`);
};
