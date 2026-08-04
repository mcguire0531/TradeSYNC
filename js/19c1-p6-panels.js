'use strict';

/* More-page P6 upload, import results, and schedule context throughout TradeSYNC. */

const p6RenderMoreBase = renderMore;
const p6RenderModalBase = renderModal;
const p6RenderBuildingCardBase = renderBuildingCard;
const p6RenderTradeTaskViewBase = renderTradeTaskView;
const p6RenderRoomOverviewPanelsBase = renderRoomOverviewPanels;

function p6ImportTime(value) {
  if (!value) return 'Not imported';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Imported';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function p6ScheduleStatusForBuilding(buildingId) {
  return data.p6ScheduleByBuilding?.[buildingId] || null;
}

function renderP6SchedulePanel() {
  const last = p6LastImport();
  const building = last ? data.buildings.find((item) => item.id === last.buildingId) : selectedBuilding();
  const schedule = building ? p6ScheduleStatusForBuilding(building.id) : null;
  const warnings = last?.warnings?.length || 0;
  return `
    <section class="p6-schedule-panel section">
      <div class="p6-schedule-panel__header">
        <span class="p6-schedule-panel__icon">${icon('calendar')}</span>
        <div><span class="small">Primavera P6 Schedule Sync</span><h2>${schedule ? escapeHtml(schedule.project.name || last?.projectName || 'P6 Schedule') : 'Connect the project schedule'}</h2><p class="muted small no-margin">Upload an XER, PMXML/XML, or P6 CSV export. TradeSYNC maps the schedule into tasks, dates, constraints, readiness gates, handoffs, progress, and notifications.</p></div>
      </div>
      ${last ? `
        <div class="p6-schedule-panel__status">
          <div><span>Building</span><strong>${escapeHtml(last.buildingName || building?.name || 'Unknown')}</strong></div>
          <div><span>Data Date</span><strong>${last.dataDate ? formatDate(p6DateOnly(last.dataDate)) : 'Not provided'}</strong></div>
          <div><span>Activities</span><strong>${last.activitiesRead}</strong></div>
          <div><span>Last Sync</span><strong>${escapeHtml(p6ImportTime(last.importedAt))}</strong></div>
        </div>
        <div class="p6-schedule-panel__changes"><span>${last.tasksCreated + last.tasksUpdated} task updates</span><span>${last.constraintsCreatedOrUpdated} schedule constraints</span><span>${last.inspectionsCreatedOrUpdated} readiness gates</span><span>${last.handoffsCreatedOrUpdated} handoffs</span>${warnings ? `<span class="p6-schedule-panel__warning">${warnings} warning${warnings === 1 ? '' : 's'}</span>` : ''}</div>`
        : `<div class="p6-schedule-panel__empty">${icon('upload')}<span>No P6 schedule has been synchronized yet.</span></div>`}
      <div class="p6-schedule-panel__actions">
        <button class="button button--primary" type="button" data-action="open-p6-import">${icon('upload')}Upload P6 File</button>
        ${last ? `<button class="button button--secondary" type="button" data-action="download-p6-report">${icon('download')}Import Report</button>` : ''}
        ${p6HasUndoBackup() ? `<button class="button button--ghost" type="button" data-action="confirm-p6-undo">Undo Last Import</button>` : ''}
      </div>
    </section>`;
}

renderMore = function renderMoreWithP6ScheduleUpload() {
  const html = p6RenderMoreBase();
  return html.replace('<section class="more-grid">', `${renderP6SchedulePanel()}<section class="more-grid">`);
};

function p6BuildingSyncBadge(building) {
  const schedule = p6ScheduleStatusForBuilding(building.id);
  if (!schedule) return '';
  return `<span class="p6-building-sync">${icon('calendar')}P6 synced ${escapeHtml(p6ImportTime(schedule.importedAt))}</span>`;
}

renderBuildingCard = function renderBuildingCardWithP6Sync(building) {
  const html = p6RenderBuildingCardBase(building);
  const badge = p6BuildingSyncBadge(building);
  if (!badge) return html;
  if (html.includes('<span class="building-card__tap-hint">')) {
    return html.replace('<span class="building-card__tap-hint">', `${badge}<span class="building-card__tap-hint">`);
  }
  return html.replace('</span>\n        <span class="building-card__chevron"', `${badge}</span>\n        <span class="building-card__chevron"`);
};

function p6TasksForRoom(roomId) {
  const tasks = data.tasksByRoom?.[roomId];
  return Array.isArray(tasks) ? tasks.filter((task) => task.p6?.current) : [];
}

function renderP6RoomScheduleContext(room, compact = false) {
  if (!room) return '';
  const tasks = p6TasksForRoom(room.id);
  const schedule = p6ScheduleStatusForBuilding(room.buildingId);
  if (!tasks.length && !schedule) return '';
  const upcoming = tasks
    .filter((task) => task.p6?.scheduleStatus !== 'complete')
    .sort((a, b) => String(a.p6?.scheduledFinish || a.dueDate || '').localeCompare(String(b.p6?.scheduledFinish || b.dueDate || '')))
    .slice(0, compact ? 2 : 4);
  const critical = tasks.filter((task) => task.p6?.isCritical && task.p6?.scheduleStatus !== 'complete').length;
  return `
    <section class="p6-room-context ${compact ? 'p6-room-context--compact' : ''} section">
      <div class="p6-room-context__head"><div><span class="small muted">P6 Schedule Context</span><h2>${escapeHtml(schedule?.project?.name || 'Imported Schedule')}</h2></div><span class="p6-room-context__data-date">Data Date ${schedule?.project?.dataDate ? formatDate(p6DateOnly(schedule.project.dataDate)) : 'not provided'}</span></div>
      <div class="p6-room-context__summary"><span><strong>${tasks.length}</strong> linked activities</span><span><strong>${critical}</strong> critical</span><span><strong>${tasks.filter((task) => task.p6?.scheduleStatus === 'complete').length}</strong> P6 complete</span></div>
      ${upcoming.length ? `<div class="p6-room-context__activities">${upcoming.map((task) => `<div><span><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.trade)}${task.p6?.wbsPath ? ` - ${escapeHtml(task.p6.wbsPath)}` : ''}</small></span><span><strong>${task.p6?.scheduledFinish ? formatDate(p6DateOnly(task.p6.scheduledFinish)) : formatDate(task.dueDate)}</strong><small>${task.p6?.percentComplete || 0}% P6 complete</small></span></div>`).join('')}</div>` : `<div class="p6-room-context__complete">${icon('check')}All linked P6 activities are complete.</div>`}
    </section>`;
}

renderTradeTaskView = function renderTradeTaskViewWithP6Context() {
  const room = selectedRoom();
  const html = p6RenderTradeTaskViewBase();
  const panel = renderP6RoomScheduleContext(room, false);
  return panel ? html.replace('<div class="content">', `<div class="content">${panel}`) : html;
};

renderRoomOverviewPanels = function renderRoomOverviewWithP6Context(room) {
  const html = p6RenderRoomOverviewPanelsBase(room);
  const panel = renderP6RoomScheduleContext(room, true);
  return panel ? `${panel}${html}` : html;
};
