'use strict';

/* Primavera P6 XER, PMXML/XML, and CSV schedule parser. */

const P6_MAX_FILE_BYTES = 25 * 1024 * 1024;
const P6_SUPPORTED_EXTENSIONS = new Set(['xer', 'xml', 'pmxml', 'csv', 'txt']);

function p6Extension(fileName) {
  const value = String(fileName || '').toLowerCase();
  const index = value.lastIndexOf('.');
  return index >= 0 ? value.slice(index + 1) : '';
}

function p6CleanValue(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function p6NormalizeKey(value) {
  return p6CleanValue(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function p6First(record, names, fallback = '') {
  for (const name of names) {
    const key = p6NormalizeKey(name);
    if (record && record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
      return record[key];
    }
  }
  return fallback;
}

function p6Number(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function p6Boolean(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'longest_path', 'critical'].includes(normalized);
}

function p6Percent(value) {
  const number = p6Number(value, 0);
  if (number > 0 && number <= 1) return Math.round(number * 100);
  return clamp(Math.round(number), 0, 100);
}

function p6ParseDate(value) {
  const raw = p6CleanValue(value);
  if (!raw) return '';

  const direct = new Date(raw.replace(' ', 'T'));
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  const dateOnly = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dateOnly) {
    const [, year, month, day, hour = '12', minute = '00', second = '00'] = dateOnly;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const monthNames = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const p6Date = raw.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (p6Date) {
    let [, day, monthName, year, hour = '12', minute = '00', second = '00'] = p6Date;
    const month = monthNames[monthName.toLowerCase()];
    let fullYear = Number(year);
    if (fullYear < 100) fullYear += fullYear >= 70 ? 1900 : 2000;
    const parsed = new Date(fullYear, month, Number(day), Number(hour), Number(minute), Number(second));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return '';
}

function p6DateOnly(value) {
  const iso = p6ParseDate(value);
  return iso ? iso.slice(0, 10) : '';
}

function p6ActivityStatus(rawStatus, percent, actualStart, actualFinish) {
  const value = String(rawStatus || '').toLowerCase();
  if (actualFinish || percent >= 100 || /complete|completed|tk_complete|finished/.test(value)) return 'complete';
  if (actualStart || percent > 0 || /active|in progress|in_progress|tk_active|started/.test(value)) return 'in-progress';
  return 'not-started';
}

function p6ParseXerTables(text) {
  const tables = {};
  let tableName = '';
  let fields = [];
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/);

  for (const line of lines) {
    if (!line) continue;
    const cells = line.split('\t');
    const marker = cells[0];
    if (marker === '%T') {
      tableName = p6CleanValue(cells[1]);
      fields = [];
      if (tableName && !tables[tableName]) tables[tableName] = [];
    } else if (marker === '%F') {
      fields = cells.slice(1).map(p6NormalizeKey);
    } else if (marker === '%R' && tableName && fields.length) {
      const record = {};
      cells.slice(1).forEach((value, index) => {
        const key = fields[index];
        if (key) record[key] = p6CleanValue(value);
      });
      tables[tableName].push(record);
    }
  }
  return tables;
}

function p6BuildWbsPathMap(wbsRows) {
  const byId = new Map();
  wbsRows.forEach((row) => {
    const id = String(p6First(row, ['wbs_id', 'object_id', 'ObjectId']));
    if (!id) return;
    byId.set(id, {
      id,
      parentId: String(p6First(row, ['parent_wbs_id', 'parent_object_id', 'ParentObjectId'])),
      code: String(p6First(row, ['wbs_short_name', 'code', 'Code'])),
      name: String(p6First(row, ['wbs_name', 'name', 'Name']))
    });
  });

  const cache = new Map();
  function pathFor(id, seen = new Set()) {
    if (!id) return '';
    if (cache.has(id)) return cache.get(id);
    if (seen.has(id)) return '';
    seen.add(id);
    const node = byId.get(id);
    if (!node) return '';
    const parentPath = pathFor(node.parentId, seen);
    const label = node.name || node.code || node.id;
    const path = [parentPath, label].filter(Boolean).join(' > ');
    cache.set(id, path);
    return path;
  }

  byId.forEach((_, id) => pathFor(id));
  return { byId, paths: cache };
}

function p6NormalizeXer(text, fileName) {
  const tables = p6ParseXerTables(text);
  const projectRows = tables.PROJECT || [];
  const wbsRows = tables.PROJWBS || tables.WBS || [];
  const taskRows = tables.TASK || [];
  const predecessorRows = tables.TASKPRED || [];
  const resourceRows = tables.RSRC || [];
  const taskResourceRows = tables.TASKRSRC || [];
  const wbs = p6BuildWbsPathMap(wbsRows);

  const projectRow = projectRows[0] || {};
  const project = {
    objectId: String(p6First(projectRow, ['proj_id', 'object_id'])),
    id: String(p6First(projectRow, ['proj_short_name', 'project_id', 'id'], 'P6 Project')),
    name: String(p6First(projectRow, ['proj_name', 'project_name', 'name'], p6First(projectRow, ['proj_short_name'], 'P6 Project'))),
    dataDate: p6ParseDate(p6First(projectRow, ['data_date', 'last_recalc_date', 'last_schedule_date'])),
    plannedStart: p6ParseDate(p6First(projectRow, ['plan_start_date', 'target_start_date', 'start_date'])),
    plannedFinish: p6ParseDate(p6First(projectRow, ['plan_end_date', 'target_end_date', 'end_date', 'scd_end_date']))
  };

  const resources = new Map();
  resourceRows.forEach((row) => {
    const id = String(p6First(row, ['rsrc_id', 'resource_id', 'object_id']));
    if (!id) return;
    resources.set(id, String(p6First(row, ['rsrc_name', 'resource_name', 'rsrc_short_name'], id)));
  });

  const resourcesByTask = new Map();
  taskResourceRows.forEach((row) => {
    const taskId = String(p6First(row, ['task_id', 'activity_object_id']));
    const resourceId = String(p6First(row, ['rsrc_id', 'resource_object_id']));
    if (!taskId || !resourceId) return;
    if (!resourcesByTask.has(taskId)) resourcesByTask.set(taskId, []);
    resourcesByTask.get(taskId).push(resources.get(resourceId) || resourceId);
  });

  const relationships = predecessorRows.map((row) => ({
    successorObjectId: String(p6First(row, ['task_id', 'successor_activity_object_id'])),
    predecessorObjectId: String(p6First(row, ['pred_task_id', 'predecessor_activity_object_id'])),
    type: String(p6First(row, ['pred_type', 'type'], 'FS')),
    lagHours: p6Number(p6First(row, ['lag_hr_cnt', 'lag_hours']), 0)
  })).filter((item) => item.successorObjectId && item.predecessorObjectId);

  const predecessorsByTask = new Map();
  relationships.forEach((relationship) => {
    if (!predecessorsByTask.has(relationship.successorObjectId)) predecessorsByTask.set(relationship.successorObjectId, []);
    predecessorsByTask.get(relationship.successorObjectId).push(relationship.predecessorObjectId);
  });

  const activities = taskRows.map((row) => {
    const objectId = String(p6First(row, ['task_id', 'object_id']));
    const activityId = String(p6First(row, ['task_code', 'activity_id', 'id'], objectId));
    const name = String(p6First(row, ['task_name', 'activity_name', 'name'], activityId));
    const wbsId = String(p6First(row, ['wbs_id', 'wbs_object_id']));
    const percent = p6Percent(p6First(row, ['phys_complete_pct', 'complete_pct', 'percent_complete', 'duration_complete_pct']));
    const actualStart = p6ParseDate(p6First(row, ['act_start_date', 'actual_start_date']));
    const actualFinish = p6ParseDate(p6First(row, ['act_end_date', 'actual_end_date', 'actual_finish_date']));
    const rawStatus = p6First(row, ['status_code', 'status']);
    const totalFloatRaw = p6First(row, ['total_float_hr_cnt', 'total_float_hours', 'total_float'], '');
    const totalFloatHours = totalFloatRaw === '' ? null : p6Number(totalFloatRaw, null);
    const taskType = String(p6First(row, ['task_type', 'activity_type']));
    return {
      objectId,
      activityId,
      name,
      projectObjectId: String(p6First(row, ['proj_id', 'project_object_id'], project.objectId)),
      wbsId,
      wbsPath: wbs.paths.get(wbsId) || '',
      start: p6ParseDate(p6First(row, ['early_start_date', 'target_start_date', 'start_date', 'act_start_date'])),
      finish: p6ParseDate(p6First(row, ['early_end_date', 'target_end_date', 'finish_date', 'end_date', 'act_end_date'])),
      actualStart,
      actualFinish,
      status: p6ActivityStatus(rawStatus, percent, actualStart, actualFinish),
      rawStatus: String(rawStatus || ''),
      percentComplete: percent,
      totalFloatHours,
      isCritical: (Number.isFinite(totalFloatHours) && totalFloatHours <= 0) || p6Boolean(p6First(row, ['is_critical', 'critical_flag', 'longest_path_flag'])),
      isMilestone: /mile/i.test(taskType),
      taskType,
      predecessorObjectIds: predecessorsByTask.get(objectId) || [],
      resourceNames: resourcesByTask.get(objectId) || [],
      calendarName: String(p6First(row, ['clndr_id', 'calendar_name'])),
      remainingDurationHours: p6Number(p6First(row, ['remain_drtn_hr_cnt', 'remaining_duration_hours']), 0),
      plannedDurationHours: p6Number(p6First(row, ['target_drtn_hr_cnt', 'planned_duration_hours']), 0)
    };
  }).filter((activity) => activity.objectId || activity.activityId || activity.name);

  return p6FinalizeSchedule({
    format: 'XER',
    fileName,
    project,
    wbs: Array.from(wbs.byId.values()).map((item) => ({ ...item, path: wbs.paths.get(item.id) || '' })),
    activities,
    relationships,
    resources: Array.from(resources.entries()).map(([id, name]) => ({ id, name }))
  });
}
