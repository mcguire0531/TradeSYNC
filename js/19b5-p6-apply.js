async function applyP6Schedule(schedule, buildingId, fileName, options = data.p6Settings) {
  if (p6ImportInProgress) throw new Error('A P6 schedule import is already running.');
  const building = data.buildings.find((item) => item.id === buildingId);
  if (!building) throw new Error('Choose a valid TradeSYNC building for this schedule.');
  if (!schedule?.activities?.length) throw new Error('The P6 file does not contain any activities.');

  p6ImportInProgress = true;
  const memorySnapshot = JSON.stringify(data);
  const backupCreated = p6CreateUndoBackup();
  const importedAt = new Date().toISOString();
  const importId = nextId('p6import');
  const projectKey = slugify(`${schedule.project.objectId || schedule.project.id || schedule.project.name}-${building.id}`) || `${building.id}-p6`;
  const context = { schedule, building, projectKey, importId, fileName, options, importedAt };
  const touchedRooms = new Set();
  const seenTaskActivityIds = new Set();
  const warnings = [];
  const summary = {
    id: importId,
    buildingId: building.id,
    buildingName: building.name,
    projectId: schedule.project.id,
    projectName: schedule.project.name,
    dataDate: schedule.project.dataDate,
    plannedFinish: schedule.project.plannedFinish,
    fileName,
    format: schedule.format,
    importedAt,
    activitiesRead: schedule.activities.length,
    tasksCreated: 0,
    tasksUpdated: 0,
    constraintsCreatedOrUpdated: 0,
    constraintsResolved: 0,
    inspectionsCreatedOrUpdated: 0,
    handoffsCreatedOrUpdated: 0,
    unmatchedActivities: 0,
    warnings,
    backupCreated
  };

  try {
    p6MarkPriorRecordsNotCurrent(building.id, projectKey);

    for (const activity of schedule.activities) {
      const trade = p6DetectTrade(activity);
      const category = p6DetectCategory(activity);
      let room = p6FindRoomForActivity(building, activity);
      let area = room ? building.areas.find((item) => item.id === room.areaId) : p6FindAreaForActivity(building, activity, category);
      const inspectionActivity = p6IsInspectionActivity(activity);
      const handoffActivity = p6IsHandoffActivity(activity);

      if (!room && trade && options.createUnassignedLocation) {
        room = p6EnsureUnassignedRoom(building, category);
        area = building.areas.find((item) => item.id === room.areaId) || area;
      }

      const mapping = { room, area, trade, category };

      if (trade && room && !inspectionActivity && !handoffActivity) {
        const result = p6UpsertTask(activity, { ...context, room, trade });
        seenTaskActivityIds.add(activity.activityId);
        touchedRooms.add(room.id);
        if (result.created) summary.tasksCreated += 1;
        else summary.tasksUpdated += 1;
      } else if (!inspectionActivity && !handoffActivity && !trade) {
        summary.unmatchedActivities += 1;
      }

      if (options.createConstraints) {
        const risk = p6ActivityRisk(activity, schedule);
        const allowConstraint = (!inspectionActivity && !handoffActivity) || risk.priority === 'critical';
        const result = allowConstraint ? p6UpsertConstraint(activity, context, mapping) : null;
        if (result) {
          if (result.resolved) summary.constraintsResolved += 1;
          else summary.constraintsCreatedOrUpdated += 1;
        }
      }

      if (inspectionActivity && options.createInspectionGates) {
        const result = p6UpsertInspection(activity, context, mapping);
        if (result) summary.inspectionsCreatedOrUpdated += 1;
      }

      if (handoffActivity && options.createHandoffs) {
        const result = p6UpsertHandoff(activity, context, mapping);
        if (result) {
          summary.handoffsCreatedOrUpdated += 1;
          touchedRooms.add(result.item.roomId);
        }
      }
    }

    Object.values(data.tasksByRoom || {}).flat().forEach((task) => {
      if (task.p6?.projectKey === projectKey && !seenTaskActivityIds.has(task.p6.activityId)) {
        task.p6.current = false;
        task.p6.removedFromScheduleAt = importedAt;
      }
    });

    const plannedFinish = p6DateOnly(schedule.project.plannedFinish);
    if (plannedFinish) building.dueDate = plannedFinish;
    building.p6 = {
      projectKey,
      projectId: schedule.project.id,
      projectName: schedule.project.name,
      dataDate: schedule.project.dataDate,
      plannedStart: schedule.project.plannedStart,
      plannedFinish: schedule.project.plannedFinish,
      lastImportAt: importedAt,
      lastImportId: importId,
      sourceFile: fileName,
      format: schedule.format
    };

    data.p6ScheduleByBuilding[building.id] = {
      projectKey,
      project: schedule.project,
      fileName,
      format: schedule.format,
      importedAt,
      stats: schedule.stats,
      activities: schedule.activities.slice(0, P6_SCHEDULE_ACTIVITY_LIMIT).map(p6CompactActivity),
      storedActivityCount: Math.min(schedule.activities.length, P6_SCHEDULE_ACTIVITY_LIMIT),
      relationshipsCount: schedule.relationships.length,
      wbsCount: schedule.wbs.length
    };
    if (schedule.activities.length > P6_SCHEDULE_ACTIVITY_LIMIT) warnings.push(`Only the first ${P6_SCHEDULE_ACTIVITY_LIMIT} compact activities were kept in local schedule history. All activities were processed.`);
    if (summary.unmatchedActivities) warnings.push(`${summary.unmatchedActivities} activity${summary.unmatchedActivities === 1 ? '' : 'ies'} had no recognized trade and remain available in the P6 schedule history.`);

    touchedRooms.forEach((roomId) => syncRoomProgress(roomId, false));
    if (typeof recalculateBuildingProgress === 'function') recalculateBuildingProgress(building.id, data);
    else if (typeof recalculateAllBuildingProgress === 'function') recalculateAllBuildingProgress(data);

    data.p6Settings = { ...options };
    data.p6Imports.unshift(summary);
    data.p6Imports = data.p6Imports.slice(0, 20);
    data.notifications.unshift({
      id: nextId('n'),
      title: 'P6 schedule synchronized',
      body: `${schedule.project.name || fileName} updated ${summary.tasksCreated + summary.tasksUpdated} task records, ${summary.constraintsCreatedOrUpdated} constraints, and ${summary.inspectionsCreatedOrUpdated} inspection gates in ${building.name}.`,
      type: summary.constraintsCreatedOrUpdated ? 'critical' : 'complete'
    });
    data.notifications = data.notifications.slice(0, 50);
    addActivity('progress', `P6 schedule imported for ${building.name}: ${schedule.stats.activities} activities processed`);
    saveData();
    p6ImportInProgress = false;
    return summary;
  } catch (error) {
    console.warn('TradeSYNC P6 import failed. Restoring the previous data.', error);
    try {
      data = JSON.parse(memorySnapshot);
      p6NormalizeAppData(data);
      saveData();
    } catch (restoreError) {
      console.warn('TradeSYNC could not restore the in-memory P6 backup.', restoreError);
    }
    p6ImportInProgress = false;
    throw error;
  }
}

function p6LastImport(buildingId = null) {
  const list = buildingId ? data.p6Imports.filter((item) => item.buildingId === buildingId) : data.p6Imports;
  return list[0] || null;
}

function p6DownloadLastImportReport() {
  const record = p6LastImport();
  if (!record) {
    toast('No P6 import report is available.');
    return;
  }
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `TradeSYNC-P6-Import-${record.id}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
