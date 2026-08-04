function p6UpsertTask(activity, context) {
  const { building, room, trade, projectKey, importId, fileName, options, importedAt } = context;
  const targetTasks = p6TaskList(room.id);
  let located = p6FindTaskByActivity(building.id, projectKey, activity.activityId);
  let task = located?.task || targetTasks.find((item) => item.trade === trade && p6TaskTitleKey(item.title) === p6TaskTitleKey(activity.name));
  let created = false;

  if (task && located && located.roomId !== room.id) {
    const index = located.tasks.indexOf(task);
    if (index >= 0) located.tasks.splice(index, 1);
    targetTasks.push(task);
    task.roomId = room.id;
  }

  if (!task) {
    const assignee = TRADE_META.find((item) => item.name === trade)?.assignee || activity.resourceNames?.[0] || 'Unassigned';
    task = makeTask(
      nextId('p6t'),
      room.id,
      trade,
      activity.name,
      activity.wbsPath ? `P6 WBS: ${activity.wbsPath}` : 'Imported from Primavera P6.',
      'not-started',
      assignee,
      p6DateOnly(activity.finish) || dateOffset(7),
      null
    );
    task.comments = [];
    task.tradeStatus = 'not-started';
    task.turnerStatus = 'not-started';
    task.tradeUpdatedAt = null;
    task.turnerUpdatedAt = null;
    task.tradeUpdatedBy = task.assignee;
    task.turnerUpdatedBy = CURRENT_USER;
    ensureTaskInterfaceState(task);
    targetTasks.push(task);
    created = true;
  }

  if (!task.comments) task.comments = [];
  task.roomId = room.id;
  task.trade = trade;
  task.title = activity.name || task.title;
  task.dueDate = p6DateOnly(activity.finish) || task.dueDate || dateOffset(7);
  if (task.p6Generated || created) task.description = activity.wbsPath ? `P6 WBS: ${activity.wbsPath}` : 'Imported from Primavera P6.';
  task.p6Generated = task.p6Generated || created;
  task.p6 = {
    ...(task.p6 || {}),
    projectKey,
    projectId: context.schedule.project.id,
    activityId: activity.activityId,
    objectId: activity.objectId,
    wbsPath: activity.wbsPath,
    scheduledStart: activity.start,
    scheduledFinish: activity.finish,
    actualStart: activity.actualStart,
    actualFinish: activity.actualFinish,
    percentComplete: activity.percentComplete,
    totalFloatHours: activity.totalFloatHours,
    isCritical: activity.isCritical,
    scheduleStatus: activity.status,
    sourceFile: fileName,
    importId,
    lastImportedAt: importedAt,
    current: true
  };

  if (options.updateTurnerActuals && (activity.actualStart || activity.actualFinish || activity.percentComplete > 0 || activity.status === 'complete')) {
    setTaskStatusForView(task, activity.status, 'turner', 'p6-import');
  }
  ensureTaskInterfaceState(task);
  return { task, created };
}

function p6IsInspectionActivity(activity) {
  const text = p6ActivitySearchText(activity);
  return /inspection|inspect |test |testing|commission|start-up|startup|witness|punch|close-in|above ceiling|hydrostatic|pressure test|final acceptance|turnover inspection/.test(text);
}

function p6IsHandoffActivity(activity) {
  return /handoff|hand-off|release to|turnover to|ready for next trade|trade release/.test(p6ActivitySearchText(activity));
}

function p6ReferenceDate(schedule) {
  const today = new Date(`${dateOffset(0)}T12:00:00`).getTime();
  const dataDate = schedule.project.dataDate ? new Date(schedule.project.dataDate).getTime() : 0;
  return new Date(Math.max(today, Number.isFinite(dataDate) ? dataDate : 0));
}

function p6ActivityRisk(activity, schedule) {
  if (activity.status === 'complete') return { risky: false, overdue: false, delayDays: 0, priority: 'low' };
  const reference = p6ReferenceDate(schedule);
  const finish = activity.finish ? new Date(activity.finish) : null;
  const overdue = Boolean(finish && !Number.isNaN(finish.getTime()) && finish < reference);
  const delayDays = overdue ? Math.max(1, Math.ceil((reference - finish) / 86400000)) : 0;
  const lowFloat = Number.isFinite(activity.totalFloatHours) && activity.totalFloatHours <= 16;
  const nearTerm = Boolean(finish && !Number.isNaN(finish.getTime()) && finish.getTime() <= reference.getTime() + (14 * 86400000));
  const risky = activity.isCritical || overdue || (lowFloat && nearTerm);
  const priority = activity.isCritical || overdue || (Number.isFinite(activity.totalFloatHours) && activity.totalFloatHours <= 0)
    ? 'critical'
    : lowFloat && nearTerm ? 'moderate' : 'low';
  return { risky, overdue, delayDays, priority };
}

function p6ImpactStage(activity) {
  const text = p6ActivitySearchText(activity);
  if (/handoff|release to|ready for next trade/.test(text)) return 'next-trade';
  if (/inspection|test|commission|witness/.test(text)) return 'inspection';
  if (/turnover|closeout|final completion|substantial completion/.test(text)) return 'turnover';
  return 'all';
}

function p6UpsertConstraint(activity, context, mapping) {
  const risk = p6ActivityRisk(activity, context.schedule);
  const id = p6StableId('p6c', context.building.id, `${context.projectKey}-${activity.activityId}`);
  let item = data.constraints.find((constraint) => constraint.id === id || (constraint.p6Generated && constraint.p6?.projectKey === context.projectKey && constraint.p6?.activityId === activity.activityId));
  let created = false;

  if (!risk.risky || activity.status === 'complete') {
    if (item && item.status === 'active') {
      normalizeConstraintImpact(item);
      item.status = 'resolved';
      item.resolution = {
        note: activity.status === 'complete' ? 'P6 reports the schedule activity complete.' : 'P6 no longer reports this activity as critical or at risk.',
        confirmed: true,
        resolvedBy: 'P6 Schedule Sync',
        resolvedAt: context.importedAt
      };
      constraintComments(item).push({
        id: nextId('cc'),
        author: 'P6 Schedule Sync',
        body: item.resolution.note,
        createdAt: context.importedAt,
        attachments: []
      });
      item.p6 = { ...(item.p6 || {}), projectKey: context.projectKey, activityId: activity.activityId, current: true, lastImportedAt: context.importedAt }; 
      return { created: false, resolved: true, item };
    }
    return null;
  }

  const room = mapping.room;
  const area = mapping.area;
  if (!item) {
    item = {
      id,
      buildingId: context.building.id,
      title: `P6 Schedule: ${activity.name}`,
      type: 'Schedule',
      priority: risk.priority,
      status: 'active',
      description: `Primavera P6 activity ${activity.activityId}${activity.wbsPath ? ` in ${activity.wbsPath}` : ''} is ${risk.overdue ? 'overdue' : 'critical or low-float'} and requires coordination.`,
      startDate: dateOffset(0),
      endDate: p6DateOnly(activity.finish) || constraintPriorityTargetDate(risk.priority, dateOffset(0)),
      owner: 'Turner Schedule Team',
      attachments: [],
      comments: [],
      createdAt: context.importedAt,
      impact: {},
      resolution: {},
      p6Generated: true
    };
    data.constraints.unshift(item);
    created = true;
  }

  item.buildingId = context.building.id;
  item.title = `P6 Schedule: ${activity.name}`;
  item.type = 'Schedule';
  item.priority = risk.priority;
  item.status = 'active';
  item.description = `Primavera P6 activity ${activity.activityId}${activity.wbsPath ? ` in ${activity.wbsPath}` : ''} is ${risk.overdue ? `${risk.delayDays} day${risk.delayDays === 1 ? '' : 's'} overdue` : 'critical or low-float'}. Scheduled finish: ${p6DateOnly(activity.finish) ? formatDate(p6DateOnly(activity.finish)) : 'not provided'}.`;
  item.startDate = item.startDate || dateOffset(0);
  item.endDate = p6DateOnly(activity.finish) || constraintPriorityTargetDate(risk.priority, item.startDate);
  item.owner = item.owner || 'Turner Schedule Team';
  item.p6Generated = true;
  item.p6 = {
    projectKey: context.projectKey,
    activityId: activity.activityId,
    objectId: activity.objectId,
    sourceFile: context.fileName,
    importId: context.importId,
    lastImportedAt: context.importedAt,
    current: true
  };
  item.impact = {
    type: risk.overdue ? 'Schedule Delay' : 'Critical Path Risk',
    scope: room ? 'room' : area ? 'location' : 'building',
    category: room?.category || area?.category || p6DetectCategory(activity),
    areaIds: area ? [area.id] : room?.areaId ? [room.areaId] : [],
    roomIds: room ? [room.id] : [],
    trades: mapping.trade ? [mapping.trade] : [],
    delayDays: risk.delayDays,
    blocksReadiness: risk.priority === 'critical',
    blockedStage: p6ImpactStage(activity),
    summary: `Imported from P6 activity ${activity.activityId}.`
  };
  item.resolution = { note: '', confirmed: false, resolvedBy: '', resolvedAt: '' };
  normalizeConstraint(item);
  normalizeConstraintImpact(item);
  normalizeConstraintPrioritySchedule(item);
  return { created, resolved: false, item };
}
