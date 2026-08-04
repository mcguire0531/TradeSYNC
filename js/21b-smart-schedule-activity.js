'use strict';

function smartExtractDates(value) {
  const text = String(value || '');
  const patterns = [
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{2,4}\b/gi,
    /\b\d{1,2}[- ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[- ]\d{2,4}\b/gi
  ];
  const found = [];
  patterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) {
      if (!found.includes(match[0])) found.push(match[0]);
    }
  });
  return found;
}

function smartParseDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const parsed = p6ParseDate(text);
  if (parsed) return parsed;
  const us = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    let year = Number(us[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const date = new Date(year, Number(us[1]) - 1, Number(us[2]), 12, 0, 0);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return '';
}

function smartNormalizeTrade(value) {
  const text = String(value || '').toLowerCase();
  if (!text) return '';
  const direct = TRADE_META.find((trade) => text === trade.name.toLowerCase() || text.includes(trade.name.toLowerCase()));
  if (direct) return direct.name;
  const aliases = [
    ['Fire Protection', ['sprinkler', 'fire protection', 'standpipe']],
    ['Low Voltage', ['low voltage', 'telecom', 'data cabling', 'security', 'access control', 'fire alarm', 'av ', 'audio visual']],
    ['Electrical', ['electrical', 'electrician', 'power', 'conduit', 'feeder', 'switchgear', 'panelboard', 'lighting']],
    ['HVAC', ['hvac', 'mechanical', 'duct', 'air handler', 'ahu', 'vav', 'chiller', 'ventilation', 'air balance']],
    ['Plumbing', ['plumbing', 'plumber', 'domestic water', 'sanitary', 'storm drain', 'fixture', 'water piping']],
    ['Drywall', ['drywall', 'gypsum', 'gyp board', 'metal stud', 'wall framing', 'tape and finish']],
    ['Flooring', ['flooring', 'carpet', 'terrazzo', 'epoxy floor', 'floor tile']],
    ['Doors', ['door hardware', 'door frame', 'lockset', 'doors']],
    ['Millwork', ['millwork', 'casework', 'cabinet', 'countertop']],
    ['Finishes', ['paint', 'painting', 'acoustical', 'ceiling', 'wall covering', 'touch-up', 'finish']]
  ];
  return aliases.find(([, words]) => words.some((word) => text.includes(word)))?.[0] || '';
}

function smartExtractRoom(value) {
  const text = String(value || '');
  const match = text.match(/\b(?:room|rm\.?|area|zone|space)\s*#?\s*([a-z0-9][a-z0-9._-]{1,14})\b/i);
  return match ? match[1] : '';
}

function smartExtractResponsible(value) {
  const text = String(value || '');
  const labeled = text.match(/\b(?:responsible|assigned to|assignee|contractor|subcontractor|company|owner|foreman|superintendent|vendor)\s*[:=-]\s*([^|;,]{2,60})/i);
  return labeled ? labeled[1].trim() : '';
}

function smartLooksLikeActivity(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length < 8 || text.length > 700) return false;
  if (/^(page\s+\d+|printed\s+on|project\s+schedule|legend|notes?|schedule report)$/i.test(text)) return false;
  const lower = text.toLowerCase();
  const hasAction = SMART_ACTION_WORDS.some((word) => lower.includes(word));
  const hasDate = smartExtractDates(text).length > 0;
  const hasTrade = Boolean(smartNormalizeTrade(text));
  const hasRoom = Boolean(smartExtractRoom(text));
  const hasActivityId = /^\s*[a-z]{0,5}[-_]?[0-9]{2,}[a-z0-9._-]*\b/i.test(text);
  return hasAction || (hasDate && (hasTrade || hasRoom || hasActivityId)) || (hasTrade && hasRoom);
}

function smartStatusFromRecord(record, percent, actualStart, actualFinish) {
  return p6ActivityStatus(record.status || '', percent, actualStart, actualFinish);
}

function smartPercentFromRecord(record) {
  const explicit = String(record.percent || '').match(/-?\d+(?:\.\d+)?/);
  if (explicit) return p6Percent(explicit[0]);
  const rawMatch = String(record.rawText || '').match(/\b(100|[1-9]?\d)(?:\.\d+)?\s*%/);
  return rawMatch ? p6Percent(rawMatch[1]) : 0;
}

function smartResponsibleList(value) {
  return String(value || '')
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function smartRecordToActivity(record, index, fileName) {
  const raw = String(record.rawText || record.name || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  const extractedDates = smartExtractDates(raw);
  const start = smartParseDate(record.start || extractedDates[0] || '');
  const finish = smartParseDate(record.finish || extractedDates[1] || extractedDates[0] || '');
  const actualStart = smartParseDate(record.actualStart || '');
  const actualFinish = smartParseDate(record.actualFinish || '');
  const percentComplete = smartPercentFromRecord(record);
  const declaredTrade = smartNormalizeTrade(record.trade || raw);
  const declaredRoom = String(record.room || smartExtractRoom(raw)).trim();
  const responsibleParty = String(record.responsible || smartExtractResponsible(raw)).trim();
  const activityId = String(record.activityId || raw.match(/^\s*([a-z]{0,5}[-_]?[0-9]{2,}[a-z0-9._-]*)\b/i)?.[1] || `DOC-${index + 1}`);
  let name = String(record.name || '').trim();
  if (!name || smartHeaderRole(name)) name = raw;
  name = name.replace(/^\s*[a-z]{0,5}[-_]?[0-9]{2,}[a-z0-9._-]*\s*[-:|]\s*/i, '').trim() || raw;
  const totalFloatRaw = String(record.totalFloat || '').match(/-?\d+(?:\.\d+)?/);
  const totalFloatHours = totalFloatRaw ? Number(totalFloatRaw[0]) : null;
  const predecessorObjectIds = String(record.predecessor || '')
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const milestoneText = `${record.milestone || ''} ${raw}`;
  const criticalText = `${record.critical || ''} ${raw}`;
  const wbsPath = [record.wbs, record.floor, record.location, declaredRoom ? `Room ${declaredRoom}` : '']
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' > ');
  const resources = smartResponsibleList(responsibleParty);

  return {
    objectId: `${slugify(fileName)}-${activityId}-${index + 1}`,
    activityId,
    name,
    projectObjectId: String(record.projectId || ''),
    wbsId: '',
    wbsPath,
    start,
    finish,
    actualStart,
    actualFinish,
    status: smartStatusFromRecord(record, percentComplete, actualStart, actualFinish),
    rawStatus: String(record.status || ''),
    percentComplete,
    totalFloatHours,
    isCritical: /\bcritical\b|longest path|critical path/i.test(criticalText) || (Number.isFinite(totalFloatHours) && totalFloatHours <= 0),
    isMilestone: /\bmilestone\b/i.test(milestoneText),
    taskType: /\bmilestone\b/i.test(milestoneText) ? 'Milestone' : 'Task Dependent',
    predecessorObjectIds,
    resourceNames: resources,
    calendarName: '',
    remainingDurationHours: 0,
    plannedDurationHours: 0,
    declaredTrade,
    declaredRoom,
    declaredLocation: String(record.location || ''),
    responsibleParty,
    sourceDocument: fileName,
    sourceLabel: String(record.sourceLabel || ''),
    sourceRow: Number(record.sourceRow || index + 1),
    importConfidence: record.name && (declaredTrade || responsibleParty) && (finish || start) ? 'high' : declaredTrade || finish || declaredRoom ? 'medium' : 'low'
  };
}

function smartScheduleFromRecords(records, fileName, format, metadata = {}) {
  const activities = records
    .map((record, index) => smartRecordToActivity(record, index, fileName))
    .filter(Boolean)
    .filter((activity, index, values) => values.findIndex((candidate) => candidate.activityId === activity.activityId && candidate.name === activity.name) === index);
  if (!activities.length) throw new Error(`TradeSYNC could not identify schedule activities in ${fileName}.`);

  const fileBase = String(fileName || 'Imported Schedule').replace(/\.[^.]+$/, '');
  const firstProject = records.find((record) => record.project)?.project || metadata.projectName || fileBase;
  const firstProjectId = records.find((record) => record.projectId)?.projectId || firstProject;
  const firstDataDate = records.find((record) => record.dataDate)?.dataDate || metadata.dataDate || '';
  return p6FinalizeSchedule({
    format,
    fileName,
    project: {
      objectId: slugify(firstProjectId),
      id: String(firstProjectId || fileBase),
      name: String(firstProject || fileBase),
      dataDate: smartParseDate(firstDataDate),
      plannedStart: '',
      plannedFinish: ''
    },
    wbs: [],
    activities,
    relationships: [],
    resources: []
  });
}
