function p6UpsertInspection(activity, context, mapping) {
  const id = p6StableId('p6i', context.building.id, `${context.projectKey}-${activity.activityId}`);
  let item = data.inspections.find((inspection) => inspection.id === id || (inspection.p6Generated && inspection.p6?.projectKey === context.projectKey && inspection.p6?.activityId === activity.activityId));
  const status = activity.status === 'complete' ? 'passed' : 'not-inspected';
  const gateStage = inferInspectionGateStage({ title: activity.name, description: activity.wbsPath });
  const trade = mapping.trade || p6DetectTrade(activity) || 'General Conditions';
  let created = false;

  if (!item) {
    item = {
      id,
      buildingId: context.building.id,
      trade,
      title: activity.name,
      description: `Readiness gate imported from P6 activity ${activity.activityId}${activity.wbsPath ? ` (${activity.wbsPath})` : ''}.`,
      status,
      assignee: 'M. Turner',
      scheduled: p6DateOnly(activity.finish || activity.start) || dateOffset(3),
      completed: status === 'passed' ? p6DateOnly(activity.actualFinish || activity.finish) || dateOffset(0) : null,
      comment: '',
      commentHistory: [],
      requiredGate: true,
      gateStage,
      blocksReadiness: true,
      affectedTrades: mapping.trade ? [mapping.trade] : [],
      p6Generated: true
    };
    data.inspections.push(item);
    created = true;
  } else {
    item.buildingId = context.building.id;
    item.trade = item.trade || trade;
    item.title = activity.name;
    item.description = item.description || `Readiness gate imported from P6 activity ${activity.activityId}.`;
    item.scheduled = p6DateOnly(activity.finish || activity.start) || item.scheduled;
    item.gateStage = gateStage;
    item.requiredGate = true;
    item.blocksReadiness = true;
    if (mapping.trade) item.affectedTrades = [mapping.trade];
    if (item.p6Generated && item.status !== 'failed') item.status = status;
    if (status === 'passed') item.completed = p6DateOnly(activity.actualFinish || activity.finish) || dateOffset(0);
  }

  item.p6 = {
    projectKey: context.projectKey,
    activityId: activity.activityId,
    objectId: activity.objectId,
    sourceFile: context.fileName,
    importId: context.importId,
    lastImportedAt: context.importedAt,
    current: true
  };
  item.p6Generated = item.p6Generated || created;
  normalizeInspectionReadinessGate(item);
  inspectionCommentHistory(item);
  return { item, created };
}

function p6NextTradeName(fromTrade) {
  const index = HANDOFF_TRADE_SEQUENCE.indexOf(fromTrade);
  const ordered = index >= 0
    ? [...HANDOFF_TRADE_SEQUENCE.slice(index + 1), ...HANDOFF_TRADE_SEQUENCE.slice(0, index + 1)]
    : HANDOFF_TRADE_SEQUENCE;
  return ordered.find((trade) => trade !== fromTrade) || '';
}

function p6UpsertHandoff(activity, context, mapping) {
  if (!mapping.room) return null;
  const trades = p6DetectAllTrades(activity);
  let fromTrade = trades[0] || mapping.trade || '';
  let toTrade = trades[1] || (fromTrade ? p6NextTradeName(fromTrade) : '');
  if (!fromTrade || !toTrade || fromTrade === toTrade) return null;

  const id = p6StableId('p6h', context.building.id, `${context.projectKey}-${activity.activityId}`);
  let item = data.handoffs.find((handoff) => handoff.id === id || (handoff.p6Generated && handoff.p6?.projectKey === context.projectKey && handoff.p6?.activityId === activity.activityId));
  const nextStatus = activity.status === 'complete' ? 'accepted' : 'requested';
  let created = false;

  if (!item) {
    item = normalizeHandoffRecord({
      id,
      buildingId: context.building.id,
      roomId: mapping.room.id,
      fromTrade,
      toTrade,
      status: nextStatus,
      dueDate: p6DateOnly(activity.finish) || dateOffset(2),
      note: `Imported from P6 activity ${activity.activityId}: ${activity.name}`,
      requestedBy: 'P6 Schedule Sync',
      respondedBy: nextStatus === 'accepted' ? 'P6 Schedule Sync' : '',
      createdAt: context.importedAt,
      updatedAt: context.importedAt,
      attachments: [],
      history: [{ id: nextId('hh'), action: nextStatus === 'accepted' ? 'P6 handoff complete' : 'P6 handoff scheduled', note: activity.name, user: 'P6 Schedule Sync', createdAt: context.importedAt }]
    });
    if (!item) return null;
    data.handoffs.unshift(item);
    created = true;
  } else {
    item.roomId = mapping.room.id;
    item.fromTrade = fromTrade;
    item.toTrade = toTrade;
    item.dueDate = p6DateOnly(activity.finish) || item.dueDate;
    if (item.p6Generated) item.status = nextStatus;
    item.updatedAt = context.importedAt;
  }

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
  return { item, created };
}

function p6CompactActivity(activity) {
  return {
    activityId: activity.activityId,
    name: activity.name,
    wbsPath: activity.wbsPath,
    start: activity.start,
    finish: activity.finish,
    actualStart: activity.actualStart,
    actualFinish: activity.actualFinish,
    status: activity.status,
    percentComplete: activity.percentComplete,
    totalFloatHours: activity.totalFloatHours,
    isCritical: activity.isCritical,
    isMilestone: activity.isMilestone,
    resourceNames: activity.resourceNames
  };
}
