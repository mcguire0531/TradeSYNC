function p6XmlElements(root, localName) {
  if (!root) return [];
  const namespaced = root.getElementsByTagNameNS ? Array.from(root.getElementsByTagNameNS('*', localName)) : [];
  if (namespaced.length) return namespaced;
  return Array.from(root.getElementsByTagName(localName));
}

function p6XmlChildText(node, names, fallback = '') {
  if (!node) return fallback;
  const wanted = new Set(names.map((name) => String(name).toLowerCase()));
  for (const child of Array.from(node.children || [])) {
    const name = String(child.localName || child.nodeName || '').replace(/^.*:/, '').toLowerCase();
    if (wanted.has(name)) return p6CleanValue(child.textContent);
  }
  return fallback;
}

function p6NormalizeXml(text, fileName) {
  if (typeof DOMParser === 'undefined') throw new Error('This browser cannot read Primavera XML files. Use an XER or CSV export instead.');
  const documentNode = new DOMParser().parseFromString(String(text || ''), 'application/xml');
  if (p6XmlElements(documentNode, 'parsererror').length) throw new Error('The Primavera XML file could not be parsed.');

  const projectNode = p6XmlElements(documentNode, 'Project')[0] || documentNode.documentElement;
  const project = {
    objectId: p6XmlChildText(projectNode, ['ObjectId', 'ProjectObjectId']),
    id: p6XmlChildText(projectNode, ['Id', 'ProjectId'], 'P6 Project'),
    name: p6XmlChildText(projectNode, ['Name', 'ProjectName'], p6XmlChildText(projectNode, ['Id'], 'P6 Project')),
    dataDate: p6ParseDate(p6XmlChildText(projectNode, ['DataDate', 'LastRecalcDate'])),
    plannedStart: p6ParseDate(p6XmlChildText(projectNode, ['PlannedStartDate', 'StartDate', 'AnticipatedStartDate'])),
    plannedFinish: p6ParseDate(p6XmlChildText(projectNode, ['PlannedFinishDate', 'FinishDate', 'AnticipatedFinishDate']))
  };

  const wbsRows = p6XmlElements(documentNode, 'WBS').map((node) => ({
    object_id: p6XmlChildText(node, ['ObjectId']),
    parent_object_id: p6XmlChildText(node, ['ParentObjectId']),
    code: p6XmlChildText(node, ['Code', 'Id']),
    name: p6XmlChildText(node, ['Name'])
  }));
  const wbs = p6BuildWbsPathMap(wbsRows);

  const resources = new Map();
  p6XmlElements(documentNode, 'Resource').forEach((node) => {
    const id = p6XmlChildText(node, ['ObjectId']);
    if (!id) return;
    resources.set(id, p6XmlChildText(node, ['Name', 'Id'], id));
  });

  const relationships = p6XmlElements(documentNode, 'Relationship').map((node) => ({
    successorObjectId: p6XmlChildText(node, ['SuccessorActivityObjectId']),
    predecessorObjectId: p6XmlChildText(node, ['PredecessorActivityObjectId']),
    type: p6XmlChildText(node, ['Type'], 'Finish to Start'),
    lagHours: p6Number(p6XmlChildText(node, ['Lag']), 0)
  })).filter((item) => item.successorObjectId && item.predecessorObjectId);

  const predecessorsByTask = new Map();
  relationships.forEach((relationship) => {
    if (!predecessorsByTask.has(relationship.successorObjectId)) predecessorsByTask.set(relationship.successorObjectId, []);
    predecessorsByTask.get(relationship.successorObjectId).push(relationship.predecessorObjectId);
  });

  const assignmentsByTask = new Map();
  p6XmlElements(documentNode, 'ResourceAssignment').forEach((node) => {
    const activityId = p6XmlChildText(node, ['ActivityObjectId']);
    const resourceId = p6XmlChildText(node, ['ResourceObjectId']);
    if (!activityId || !resourceId) return;
    if (!assignmentsByTask.has(activityId)) assignmentsByTask.set(activityId, []);
    assignmentsByTask.get(activityId).push(resources.get(resourceId) || resourceId);
  });

  const activities = p6XmlElements(documentNode, 'Activity').map((node) => {
    const objectId = p6XmlChildText(node, ['ObjectId']);
    const activityId = p6XmlChildText(node, ['Id', 'ActivityId'], objectId);
    const name = p6XmlChildText(node, ['Name'], activityId);
    const wbsId = p6XmlChildText(node, ['WBSObjectId']);
    const percent = p6Percent(p6XmlChildText(node, ['PhysicalPercentComplete', 'PercentComplete', 'DurationPercentComplete']));
    const actualStart = p6ParseDate(p6XmlChildText(node, ['ActualStartDate']));
    const actualFinish = p6ParseDate(p6XmlChildText(node, ['ActualFinishDate']));
    const rawStatus = p6XmlChildText(node, ['Status']);
    const totalFloatRaw = p6XmlChildText(node, ['TotalFloat', 'TotalFloatHours']);
    const totalFloatHours = totalFloatRaw === '' ? null : p6Number(totalFloatRaw, null);
    const taskType = p6XmlChildText(node, ['Type', 'ActivityType']);
    return {
      objectId,
      activityId,
      name,
      projectObjectId: p6XmlChildText(node, ['ProjectObjectId'], project.objectId),
      wbsId,
      wbsPath: wbs.paths.get(wbsId) || '',
      start: p6ParseDate(p6XmlChildText(node, ['StartDate', 'PlannedStartDate', 'EarlyStartDate'])),
      finish: p6ParseDate(p6XmlChildText(node, ['FinishDate', 'PlannedFinishDate', 'EarlyFinishDate'])),
      actualStart,
      actualFinish,
      status: p6ActivityStatus(rawStatus, percent, actualStart, actualFinish),
      rawStatus,
      percentComplete: percent,
      totalFloatHours,
      isCritical: (Number.isFinite(totalFloatHours) && totalFloatHours <= 0) || p6Boolean(p6XmlChildText(node, ['IsLongestPath', 'IsCritical'])),
      isMilestone: /mile/i.test(taskType),
      taskType,
      predecessorObjectIds: predecessorsByTask.get(objectId) || [],
      resourceNames: assignmentsByTask.get(objectId) || [],
      calendarName: p6XmlChildText(node, ['CalendarName', 'CalendarObjectId']),
      remainingDurationHours: p6Number(p6XmlChildText(node, ['RemainingDuration']), 0),
      plannedDurationHours: p6Number(p6XmlChildText(node, ['PlannedDuration']), 0)
    };
  }).filter((activity) => activity.objectId || activity.activityId || activity.name);

  return p6FinalizeSchedule({
    format: 'PMXML',
    fileName,
    project,
    wbs: Array.from(wbs.byId.values()).map((item) => ({ ...item, path: wbs.paths.get(item.id) || '' })),
    activities,
    relationships,
    resources: Array.from(resources.entries()).map(([id, name]) => ({ id, name }))
  });
}
