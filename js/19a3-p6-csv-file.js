function p6ParseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
  return rows;
}

function p6NormalizeCsv(text, fileName) {
  const rows = p6ParseCsvRows(text);
  if (rows.length < 2) throw new Error('The P6 CSV file does not contain activity rows.');
  const headers = rows[0].map(p6NormalizeKey);
  const records = rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => { if (header) record[header] = p6CleanValue(cells[index]); });
    return record;
  });

  const activities = records.map((row, index) => {
    const objectId = String(p6First(row, ['object_id', 'activity_object_id'], `csv-${index + 1}`));
    const activityId = String(p6First(row, ['activity_id', 'id', 'activity_code'], objectId));
    const name = String(p6First(row, ['activity_name', 'name', 'task_name'], activityId));
    const percent = p6Percent(p6First(row, ['percent_complete', 'physical_percent_complete', 'activity_percent_complete', 'complete_pct']));
    const actualStart = p6ParseDate(p6First(row, ['actual_start', 'actual_start_date']));
    const actualFinish = p6ParseDate(p6First(row, ['actual_finish', 'actual_finish_date']));
    const rawStatus = p6First(row, ['status', 'activity_status']);
    const totalFloatRaw = p6First(row, ['total_float_hours', 'total_float_hr_cnt', 'total_float'], '');
    const totalFloatHours = totalFloatRaw === '' ? null : p6Number(totalFloatRaw, null);
    const taskType = String(p6First(row, ['activity_type', 'type']));
    return {
      objectId,
      activityId,
      name,
      projectObjectId: String(p6First(row, ['project_object_id', 'project_id'])),
      wbsId: String(p6First(row, ['wbs_object_id', 'wbs_id'])),
      wbsPath: String(p6First(row, ['wbs_path', 'wbs', 'wbs_name'])),
      start: p6ParseDate(p6First(row, ['start', 'start_date', 'planned_start', 'planned_start_date'])),
      finish: p6ParseDate(p6First(row, ['finish', 'finish_date', 'planned_finish', 'planned_finish_date'])),
      actualStart,
      actualFinish,
      status: p6ActivityStatus(rawStatus, percent, actualStart, actualFinish),
      rawStatus: String(rawStatus || ''),
      percentComplete: percent,
      totalFloatHours,
      isCritical: (Number.isFinite(totalFloatHours) && totalFloatHours <= 0) || p6Boolean(p6First(row, ['critical', 'is_critical', 'longest_path'])),
      isMilestone: /mile/i.test(taskType),
      taskType,
      predecessorObjectIds: String(p6First(row, ['predecessors', 'predecessor_ids'])).split(/[;,|]/).map(p6CleanValue).filter(Boolean),
      resourceNames: String(p6First(row, ['resources', 'resource_names', 'primary_resource'])).split(/[;,|]/).map(p6CleanValue).filter(Boolean),
      calendarName: String(p6First(row, ['calendar', 'calendar_name'])),
      remainingDurationHours: p6Number(p6First(row, ['remaining_duration_hours', 'remaining_duration']), 0),
      plannedDurationHours: p6Number(p6First(row, ['planned_duration_hours', 'planned_duration']), 0)
    };
  }).filter((activity) => activity.name);

  const projectName = String(p6First(records[0] || {}, ['project_name', 'project', 'project_id'], fileName.replace(/\.[^.]+$/, '')));
  const finishDates = activities.map((activity) => activity.finish).filter(Boolean).sort();
  const startDates = activities.map((activity) => activity.start).filter(Boolean).sort();
  return p6FinalizeSchedule({
    format: 'CSV',
    fileName,
    project: {
      objectId: String(p6First(records[0] || {}, ['project_object_id'])),
      id: String(p6First(records[0] || {}, ['project_id'], projectName)),
      name: projectName,
      dataDate: p6ParseDate(p6First(records[0] || {}, ['data_date'])),
      plannedStart: startDates[0] || '',
      plannedFinish: finishDates[finishDates.length - 1] || ''
    },
    wbs: [],
    activities,
    relationships: [],
    resources: []
  });
}

function p6FinalizeSchedule(schedule) {
  const activities = schedule.activities || [];
  const validDates = activities.flatMap((activity) => [activity.start, activity.finish]).filter(Boolean).sort();
  if (!schedule.project.plannedStart && validDates.length) schedule.project.plannedStart = validDates[0];
  if (!schedule.project.plannedFinish && validDates.length) schedule.project.plannedFinish = validDates[validDates.length - 1];
  if (!schedule.project.dataDate) schedule.project.dataDate = schedule.project.plannedStart || new Date().toISOString();
  schedule.activities = activities.sort((a, b) => String(a.start || a.finish || a.activityId).localeCompare(String(b.start || b.finish || b.activityId)));
  schedule.stats = {
    activities: schedule.activities.length,
    completed: schedule.activities.filter((activity) => activity.status === 'complete').length,
    inProgress: schedule.activities.filter((activity) => activity.status === 'in-progress').length,
    notStarted: schedule.activities.filter((activity) => activity.status === 'not-started').length,
    critical: schedule.activities.filter((activity) => activity.isCritical && activity.status !== 'complete').length,
    milestones: schedule.activities.filter((activity) => activity.isMilestone).length,
    wbs: (schedule.wbs || []).length,
    relationships: (schedule.relationships || []).length
  };
  return schedule;
}

async function parseP6File(file) {
  if (!file || typeof file.text !== 'function') throw new Error('Choose a Primavera P6 file.');
  if (file.size > P6_MAX_FILE_BYTES) throw new Error('The P6 file is larger than 25 MB. Export a smaller project or filtered schedule.');
  const extension = p6Extension(file.name);
  if (!P6_SUPPORTED_EXTENSIONS.has(extension)) throw new Error('Use a Primavera XER, PMXML/XML, or CSV schedule export.');
  const text = await file.text();
  if (!text.trim()) throw new Error('The selected P6 file is empty.');

  if (extension === 'xer' || text.startsWith('ERMHDR') || /\n%T\tPROJECT/.test(`\n${text}`)) return p6NormalizeXer(text, file.name);
  if (extension === 'xml' || extension === 'pmxml' || /^\s*</.test(text)) return p6NormalizeXml(text, file.name);
  return p6NormalizeCsv(text, file.name);
}
