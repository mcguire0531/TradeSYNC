'use strict';

/*
 * Smart schedule-document reader.
 *
 * Extends the existing Primavera import so the same workflow can read
 * searchable PDFs and common spreadsheet files. The resulting activities use
 * the existing TradeSYNC P6 mapping and synchronization engine.
 */

const SMART_SCHEDULE_MAX_FILE_BYTES = 35 * 1024 * 1024;
const SMART_PDFJS_VERSION = '5.7.284';
const SMART_PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${SMART_PDFJS_VERSION}/build/pdf.mjs`;
const SMART_PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${SMART_PDFJS_VERSION}/build/pdf.worker.mjs`;
const SMART_SHEETJS_MODULE_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
const SMART_SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'fods', 'slk', 'dif', 'dbf', 'prn']);
const SMART_TEXT_EXTENSIONS = new Set(['tsv', 'json', 'html', 'htm']);
const SMART_DOCUMENT_EXTENSIONS = new Set(['pdf', ...SMART_SPREADSHEET_EXTENSIONS, ...SMART_TEXT_EXTENSIONS]);
const smartScheduleParseP6FileBase = parseP6File;

SMART_DOCUMENT_EXTENSIONS.forEach((extension) => P6_SUPPORTED_EXTENSIONS.add(extension));

let smartPdfJsPromise = null;
let smartSheetJsPromise = null;

const SMART_HEADER_ALIASES = {
  activityId: ['activity id', 'activityid', 'act id', 'task id', 'taskid', 'item id', 'line id', 'id', 'activity code'],
  name: ['activity name', 'task name', 'activity description', 'task description', 'description', 'scope of work', 'scope', 'work item', 'activity', 'task'],
  responsible: ['responsible party', 'responsible company', 'responsible contractor', 'assigned to', 'assignee', 'owner', 'contractor', 'subcontractor', 'company', 'vendor', 'resource', 'crew', 'foreman', 'superintendent'],
  trade: ['responsible trade', 'assigned trade', 'trade', 'discipline', 'craft', 'division', 'scope trade'],
  room: ['room number', 'room no', 'room', 'space', 'space number', 'work area', 'area number', 'zone'],
  location: ['location', 'wing', 'building area', 'section', 'floor location', 'work location'],
  floor: ['floor', 'level', 'story'],
  wbs: ['wbs path', 'wbs', 'phase', 'work breakdown structure', 'schedule area'],
  start: ['planned start', 'start date', 'early start', 'baseline start', 'start', 'begin'],
  finish: ['planned finish', 'finish date', 'early finish', 'baseline finish', 'due date', 'target date', 'completion date', 'finish', 'end date', 'end'],
  actualStart: ['actual start', 'actual start date'],
  actualFinish: ['actual finish', 'actual finish date', 'completed date', 'date completed'],
  status: ['activity status', 'task status', 'status', 'state'],
  percent: ['percent complete', 'physical percent complete', 'duration percent complete', '% complete', 'complete %', 'progress'],
  totalFloat: ['total float hours', 'total float', 'float hours', 'float'],
  critical: ['critical path', 'critical', 'longest path'],
  predecessor: ['predecessor ids', 'predecessors', 'predecessor', 'depends on', 'dependency'],
  milestone: ['milestone', 'activity type', 'task type'],
  project: ['project name', 'project', 'building name'],
  projectId: ['project id', 'project number', 'job number'],
  dataDate: ['data date', 'status date', 'schedule date']
};

const SMART_ACTION_WORDS = [
  'install', 'inspect', 'test', 'testing', 'complete', 'finish', 'start', 'rough-in', 'rough in',
  'frame', 'hang', 'paint', 'pour', 'set', 'connect', 'terminate', 'balance', 'commission',
  'startup', 'start-up', 'close-in', 'close in', 'release', 'handoff', 'hand-off', 'turnover',
  'deliver', 'fabricate', 'procure', 'coordinate', 'review', 'approve', 'submit', 'mobilize',
  'demolish', 'excavate', 'backfill', 'erect', 'seal', 'caulk', 'punch', 'verify'
];

function smartDocumentExtension(fileName) {
  return p6Extension(fileName);
}

function smartNormalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[%]/g, ' percent ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function smartHeaderRole(value) {
  const normalized = smartNormalizeHeader(value);
  if (!normalized) return '';
  for (const [role, aliases] of Object.entries(SMART_HEADER_ALIASES)) {
    if (aliases.some((alias) => normalized === alias || normalized.replace(/\s+/g, '') === alias.replace(/\s+/g, ''))) return role;
  }
  return '';
}

function smartHeaderMap(cells) {
  const roles = cells.map(smartHeaderRole);
  const unique = new Set(roles.filter(Boolean));
  let score = unique.size;
  if (unique.has('name')) score += 2;
  if (unique.has('activityId')) score += 1;
  if (unique.has('finish') || unique.has('start')) score += 1;
  if (unique.has('responsible') || unique.has('trade')) score += 1;
  return { roles, score, unique };
}

function smartSplitTextLine(line) {
  const clean = String(line || '').replace(/\u00a0/g, ' ').trim();
  if (!clean) return [];
  if (clean.includes('\t')) return clean.split(/\t+/).map((cell) => cell.trim()).filter((cell, index, values) => cell || index < values.length - 1);
  if ((clean.match(/\|/g) || []).length >= 2) return clean.split('|').map((cell) => cell.trim());
  if (/\s{2,}/.test(clean)) return clean.split(/\s{2,}/).map((cell) => cell.trim());
  return [clean];
}

function smartCanonicalRecord(headers, cells, metadata = {}) {
  const record = { ...metadata };
  headers.forEach((role, index) => {
    if (!role) return;
    const value = String(cells[index] ?? '').trim();
    if (!value) return;
    if (record[role]) record[role] = `${record[role]} | ${value}`;
    else record[role] = value;
  });
  record.rawText = cells.filter(Boolean).join(' | ');
  return record;
}

function smartFindHeader(rows, maximum = 80) {
  let best = null;
  rows.slice(0, maximum).forEach((cells, index) => {
    const analysis = smartHeaderMap(cells);
    if (!best || analysis.score > best.score) best = { ...analysis, index, cells };
  });
  return best && best.score >= 3 ? best : null;
}

function smartRecordsFromMatrix(matrix, sourceLabel = '') {
  const rows = matrix
    .map((row) => Array.from(row || []).map((cell) => String(cell ?? '').replace(/\u00a0/g, ' ').trim()))
    .filter((row) => row.some(Boolean));
  if (!rows.length) return [];

  const header = smartFindHeader(rows);
  if (header) {
    const records = [];
    for (let index = header.index + 1; index < rows.length; index += 1) {
      const cells = rows[index];
      const repeated = smartHeaderMap(cells);
      if (repeated.score >= header.score && repeated.unique.has('name')) continue;
      const record = smartCanonicalRecord(header.roles, cells, { sourceLabel, sourceRow: index + 1 });
      if (record.name || record.activityId || record.rawText.length >= 8) records.push(record);
    }
    return records;
  }

  return rows.map((cells, index) => ({
    rawText: cells.filter(Boolean).join(' | '),
    name: cells.filter(Boolean).join(' - '),
    sourceLabel,
    sourceRow: index + 1
  })).filter((record) => smartLooksLikeActivity(record.rawText));
}
