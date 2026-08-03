'use strict';

/* Priority-based constraint deadlines and direct room-to-building progress roll-up. */

const CONSTRAINT_PRIORITY_RESOLVE_DAYS = Object.freeze({
  critical: 2,
  moderate: 7,
  low: 14
});

const priorityProgressBuildDemoDataBase = buildDemoData;
const priorityProgressSyncRoomProgressBase = syncRoomProgress;
const priorityProgressRenderReferenceConstraintCardBase = renderReferenceConstraintCard;
const priorityProgressRenderConstraintDetailModalBase = renderConstraintDetailModal;
const priorityProgressRenderBuildingCardBase = renderBuildingCard;
const priorityProgressRenderTradeTaskViewBase = renderTradeTaskView;
const priorityProgressRenderRoomOverviewPanelsBase = renderRoomOverviewPanels;
const priorityProgressAddConstraintFromFormBase = addConstraintFromForm;
const priorityProgressRenderBase = render;
const priorityProgressAddRoomFromFormBase = typeof addRoomFromForm === 'function' ? addRoomFromForm : null;
const priorityProgressRemoveBuildingBase = typeof removeBuilding === 'function' ? removeBuilding : null;

function constraintPriorityResolveDays(priority) {
  return CONSTRAINT_PRIORITY_RESOLVE_DAYS[priority] || CONSTRAINT_PRIORITY_RESOLVE_DAYS.moderate;
}

function validIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function addDaysToIsoDate(value, days) {
  const source = validIsoDate(value) ? value : dateOffset(0);
  const date = new Date(`${source}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function constraintPriorityStartDate(item) {
  const createdDate = String(item?.createdAt || '').slice(0, 10);
  if (validIsoDate(item?.startDate)) return item.startDate;
  if (validIsoDate(createdDate)) return createdDate;
  return dateOffset(0);
}

function constraintPriorityTargetDate(priority, startDate = dateOffset(0)) {
  return addDaysToIsoDate(startDate, constraintPriorityResolveDays(priority));
}

function constraintPriorityPolicyCopy(priority) {
  const days = constraintPriorityResolveDays(priority);
  if (priority === 'critical') return `Critical Path constraints target resolution within ${days} calendar days.`;
  if (priority === 'low') return `Low-priority constraints target resolution within ${days} calendar days.`;
  return `Moderate constraints target resolution within ${days} calendar days.`;
}

function normalizeConstraintPrioritySchedule(item) {
  if (!item || typeof item !== 'object') return item;
  const priority = ['critical', 'moderate', 'low'].includes(item.priority) ? item.priority : 'moderate';
  const startDate = constraintPriorityStartDate(item);
  const targetDate = constraintPriorityTargetDate(priority, startDate);
  item.priority = priority;
  item.startDate = startDate;
  item.priorityTargetDays = constraintPriorityResolveDays(priority);
  item.priorityTargetDate = targetDate;

  // Active records may be due earlier, but never later than their priority target.
  if (item.status !== 'resolved' && (!validIsoDate(item.endDate) || item.endDate > targetDate)) {
    item.endDate = targetDate;
  }
  return item;
}

function constraintPriorityDeadlineState(item) {
  normalizeConstraintPrioritySchedule(item);
  if (item.status === 'resolved') return 'resolved';
  const days = daysFromToday(item.endDate);
  if (!Number.isFinite(days)) return 'scheduled';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 2) return 'urgent';
  return 'scheduled';
}

function constraintPriorityDeadlineLabel(item) {
  const days = constraintPriorityResolveDays(item.priority);
  const state = constraintPriorityDeadlineState(item);
  if (state === 'overdue') return `${priorityLabel(item.priority)} · overdue`;
  if (state === 'today') return `${priorityLabel(item.priority)} · due today`;
  return `${priorityLabel(item.priority)} · ${days}-day target`;
}

function taskTurnerStatusForRollup(task) {
  return validCollaborationStatus(task?.turnerStatus || task?.status || 'not-started');
}

function officialRoomProgressForTarget(room, target = data) {
  if (!room) return 0;
  const tasks = target.tasksByRoom?.[room.id];
  if (!Array.isArray(tasks) || !tasks.length) return clamp(Number(room.progress) || 0, 0, 100);

  const completedTrades = TRADE_META.filter((trade) => {
    const tradeTasks = tasks.filter((task) => task.trade === trade.name);
    return tradeTasks.length > 0 && tradeTasks.every((task) => taskTurnerStatusForRollup(task) === 'complete');
  }).length;
  return Math.round((completedTrades / TRADE_META.length) * 100);
}

function recalculateBuildingProgress(buildingId, target = data) {
  const building = (target.buildings || []).find((item) => item.id === buildingId);
  if (!building) return 0;
  const rooms = (target.rooms || []).filter((room) => room.buildingId === buildingId);
  const roomProgress = rooms.map((room) => {
    const progress = officialRoomProgressForTarget(room, target);
    const tasks = target.tasksByRoom?.[room.id];
    if (Array.isArray(tasks) && tasks.length) {
      room.progress = progress;
      room.status = progress === 100 ? 'complete' : progress === 0 ? 'not-started' : 'incomplete';
    }
    return progress;
  });
  const progress = roomProgress.length
    ? Math.round(roomProgress.reduce((sum, value) => sum + value, 0) / roomProgress.length)
    : 0;
  const changed = Number(building.progress) !== progress;
  building.progress = progress;
  building.progressSource = 'equal-room-average';
  building.progressRoomCount = rooms.length;
  if (changed) building.progressUpdatedAt = new Date().toISOString();
  return progress;
}

function recalculateAllBuildingProgress(target = data) {
  (target.buildings || []).forEach((building) => recalculateBuildingProgress(building.id, target));
  return target;
}

function normalizePriorityProgressData(target) {
  (target.constraints || []).forEach(normalizeConstraintPrioritySchedule);
  recalculateAllBuildingProgress(target);
  return target;
}

buildDemoData = function buildDemoDataWithPriorityDeadlinesAndProgressRollup() {
  return normalizePriorityProgressData(priorityProgressBuildDemoDataBase());
};

normalizePriorityProgressData(data);
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not save the priority and progress migration.', error);
}

syncRoomProgress = function syncRoomProgressAndBuildingRollup(roomId = ui.selectedRoomId, persist = true) {
  priorityProgressSyncRoomProgressBase(roomId, false);
  const room = data.rooms.find((item) => item.id === roomId);
  const percent = room ? officialRoomProgressForTarget(room, data) : 0;
  if (room) {
    room.progress = percent;
    room.status = percent === 100 ? 'complete' : percent === 0 ? 'not-started' : 'incomplete';
    room.statusClashes = roomTaskClashes(roomId).length;
    recalculateBuildingProgress(room.buildingId, data);
  }
  if (persist) saveData();
  return percent;
};

renderReferenceConstraintCard = function renderConstraintCardWithPriorityDeadline(item) {
  normalizeConstraintPrioritySchedule(item);
  const html = priorityProgressRenderReferenceConstraintCardBase(item);
  const state = constraintPriorityDeadlineState(item);
  const label = constraintPriorityDeadlineLabel(item);
  return html.replace(
    '<div class="constraint-resolve-by"><span>Resolve By</span><strong>',
    `<div class="constraint-resolve-by constraint-resolve-by--${escapeHtml(item.priority)} constraint-resolve-by--${escapeHtml(state)}"><span>Resolve By <em>${escapeHtml(label)}</em></span><strong>`
  );
};

renderConstraintDetailModal = function renderConstraintDetailWithPriorityPolicy() {
  const item = data.constraints.find((constraint) => constraint.id === ui.modal?.constraintId);
  if (item) normalizeConstraintPrioritySchedule(item);
  const html = priorityProgressRenderConstraintDetailModalBase();
  if (!item || !html) return html;
  const state = constraintPriorityDeadlineState(item);
  const policy = `
    <section class="constraint-priority-policy constraint-priority-policy--${escapeHtml(item.priority)} constraint-priority-policy--${escapeHtml(state)}">
      <span class="constraint-priority-policy__icon">${icon('calendar')}</span>
      <div><strong>${escapeHtml(priorityLabel(item.priority))} Resolution Target</strong><p>${escapeHtml(constraintPriorityPolicyCopy(item.priority))}</p></div>
      <div class="constraint-priority-policy__date"><span>Resolve By</span><strong>${formatDate(item.endDate)}</strong></div>
    </section>`;
  return html.replace('<div class="constraint-detail-meta constraint-detail-meta--building">', `${policy}<div class="constraint-detail-meta constraint-detail-meta--building">`);
};

function renderBuildingProgressRollupPanel(room, compact = false) {
  if (!room) return '';
  const building = data.buildings.find((item) => item.id === room.buildingId) || selectedBuilding();
  if (!building) return '';
  const rooms = projectRoomsForBuilding(building.id);
  const roomProgress = officialRoomProgressForTarget(room, data);
  const buildingProgress = recalculateBuildingProgress(building.id, data);
  return `
    <section class="progress-rollup-card ${compact ? 'progress-rollup-card--compact' : ''} section">
      <div class="progress-rollup-card__head">
        <div><span class="small muted">Direct Progress Roll-Up</span><h2>Room progress drives building progress</h2></div>
        <span class="progress-rollup-card__formula">Average of ${rooms.length} room${rooms.length === 1 ? '' : 's'}</span>
      </div>
      <div class="progress-rollup-card__rows">
        <div class="progress-rollup-row"><span><strong>${room.category === 'exterior' ? 'Area' : 'Room'} ${escapeHtml(room.number)}</strong><small>Turner-confirmed trade progress</small></span>${makeProgress(roomProgress, progressColor(roomProgress))}<strong>${roomProgress}%</strong></div>
        <div class="progress-rollup-row progress-rollup-row--building"><span><strong>${escapeHtml(building.name)}</strong><small>Equal average of every room and work area</small></span>${makeProgress(buildingProgress, progressColor(buildingProgress))}<strong>${buildingProgress}%</strong></div>
      </div>
      <p class="progress-rollup-card__note">Updating this room immediately recalculates the building percentage shown on Home.</p>
    </section>`;
}

renderBuildingCard = function renderBuildingCardWithRoomProgressRollup(building) {
  normalizeProjectBuilding(building);
  const days = daysFromToday(building.dueDate);
  const counts = buildingLocationCounts(building);
  const readiness = buildingReadinessSummary(building.id);
  const progress = recalculateBuildingProgress(building.id, data);
  return `
    <article class="building-card building-card--with-areas building-card--mobile-flow building-card--readiness building-card--progress-rollup">
      <button class="building-card__project" type="button" data-action="select-building" data-building="${escapeHtml(building.id)}" aria-label="Open ${escapeHtml(building.name)} and choose Interior or Exterior">
        <img class="building-card__image" src="${escapeHtml(building.image)}" alt="${escapeHtml(building.name)}" />
        <span class="building-card__content">
          <span class="building-card__title">${escapeHtml(building.name)}</span>
          <span class="small muted">${escapeHtml(building.address)}</span>
          <span class="building-card__meta">${icon('calendar')}<span>Due: <strong class="${days < 0 ? 'text-red' : ''}">${formatDate(building.dueDate)}</strong></span></span>
          <span class="building-progress-label"><small>Room progress roll-up</small><strong>${progress}%</strong></span>
          <span class="progress-row">${makeProgress(progress)}<span class="progress-number">${progress}%</span></span>
          ${renderReadinessMiniSummary(readiness)}
          <span class="building-card__tap-hint">Tap to choose Interior or Exterior</span>
        </span>
        <span class="building-card__chevron" aria-hidden="true">${icon('chevron')}</span>
      </button>
      <div class="building-card__area-footer building-card__mobile-footer">
        <div class="building-card__category-summary" aria-label="Building section totals">
          <span class="building-category-pill building-category-pill--interior"><strong>${counts.interiorRooms}</strong> Interior</span>
          <span class="building-category-pill building-category-pill--exterior"><strong>${counts.exteriorRooms}</strong> Exterior</span>
        </div>
        <button class="building-remove-button" type="button" data-action="remove-building" data-building="${escapeHtml(building.id)}" aria-label="Remove ${escapeHtml(building.name)}">${icon('x')}<span>Remove</span></button>
      </div>
    </article>`;
};

renderRoomOverviewPanels = function renderRoomOverviewWithBuildingProgressCorrelation(room) {
  const html = priorityProgressRenderRoomOverviewPanelsBase(room);
  return html.replace('<section class="metric-strip section trade-metric-strip">', `${renderBuildingProgressRollupPanel(room, true)}<section class="metric-strip section trade-metric-strip">`);
};

renderTradeTaskView = function renderTaskViewWithBuildingProgressCorrelation() {
  const room = selectedRoom();
  const html = priorityProgressRenderTradeTaskViewBase();
  return html.replace('<div class="content">', `<div class="content">${renderBuildingProgressRollupPanel(room)}`);
};

addConstraintFromForm = async function addConstraintWithPriorityDeadline(formData) {
  const priority = ['critical', 'moderate', 'low'].includes(String(formData.get('priority')))
    ? String(formData.get('priority'))
    : 'moderate';
  const maximumDate = constraintPriorityTargetDate(priority, dateOffset(0));
  const selectedDate = String(formData.get('resolveBy') || '');
  if (!validIsoDate(selectedDate) || selectedDate > maximumDate) formData.set('resolveBy', maximumDate);
  await priorityProgressAddConstraintFromFormBase(formData);
  data.constraints.forEach(normalizeConstraintPrioritySchedule);
  recalculateAllBuildingProgress(data);
  try { saveData(); } catch (error) { console.warn('TradeSYNC could not save the constraint deadline.', error); }
};

if (priorityProgressAddRoomFromFormBase) {
  addRoomFromForm = function addRoomAndRecalculateBuilding(formData) {
    const buildingId = String(formData.get('buildingId') || ui.selectedBuildingId || '');
    const result = priorityProgressAddRoomFromFormBase(formData);
    recalculateBuildingProgress(buildingId, data);
    try { saveData(); } catch (error) { console.warn('TradeSYNC could not save building progress after adding the room.', error); }
    render();
    return result;
  };
}

if (priorityProgressRemoveBuildingBase) {
  removeBuilding = function removeBuildingAndRecalculateProgress(buildingId) {
    const result = priorityProgressRemoveBuildingBase(buildingId);
    recalculateAllBuildingProgress(data);
    try { saveData(); } catch (error) { console.warn('TradeSYNC could not save building progress after removal.', error); }
    return result;
  };
}

function applyConstraintPriorityDateToForm(form, { force = false } = {}) {
  if (!form) return;
  const priorityInput = form.querySelector('#constraint-priority');
  const dateInput = form.querySelector('#constraint-resolve-by');
  if (!priorityInput || !dateInput) return;
  const priority = priorityInput.value;
  const targetDate = constraintPriorityTargetDate(priority, dateOffset(0));
  dateInput.min = dateOffset(0);
  dateInput.max = targetDate;
  if (force || !validIsoDate(dateInput.value) || dateInput.value > targetDate) dateInput.value = targetDate;
  const helper = form.querySelector('[data-constraint-priority-date-help]');
  if (helper) helper.textContent = `${constraintPriorityPolicyCopy(priority)} You may choose an earlier date, but not a later one.`;
  const field = dateInput.closest('.field');
  field?.classList.remove('priority-date-field--critical', 'priority-date-field--moderate', 'priority-date-field--low');
  field?.classList.add(`priority-date-field--${priority}`);
}

function enhanceConstraintPriorityDateForm() {
  const form = document.getElementById('add-constraint-form');
  if (!form || form.dataset.priorityDateEnhanced === 'true') return;
  const dateInput = form.querySelector('#constraint-resolve-by');
  if (!dateInput) return;
  form.dataset.priorityDateEnhanced = 'true';
  const helper = document.createElement('div');
  helper.className = 'field-help constraint-priority-date-help';
  helper.dataset.constraintPriorityDateHelp = 'true';
  dateInput.insertAdjacentElement('afterend', helper);
  applyConstraintPriorityDateToForm(form);
}

render = function renderWithPriorityDatesAndProgressRollup() {
  data.constraints.forEach(normalizeConstraintPrioritySchedule);
  recalculateAllBuildingProgress(data);
  const result = priorityProgressRenderBase();
  enhanceConstraintPriorityDateForm();
  return result;
};

document.addEventListener('change', (event) => {
  if (event.target.id !== 'constraint-priority') return;
  applyConstraintPriorityDateToForm(event.target.closest('form'), { force: true });
}, true);

if (['home', 'rooms', 'room', 'tasks', 'constraints'].includes(route().view)) render();
