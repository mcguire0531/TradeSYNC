'use strict';

async function smartParseSpreadsheetSchedule(file) {
  const XLSX = await smartLoadSheetJs();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, dense: false });
  const records = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: false });
    smartRecordsFromMatrix(matrix, sheetName).forEach((record) => records.push(record));
  });
  if (!records.length) throw new Error('No schedule rows were found in the spreadsheet.');
  return smartScheduleFromRecords(records, file.name, smartDocumentExtension(file.name).toUpperCase(), { projectName: file.name.replace(/\.[^.]+$/, '') });
}

function smartParseJsonSchedule(text, fileName) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('The JSON schedule file is not valid JSON.');
  }
  const source = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.activities) ? parsed.activities
      : Array.isArray(parsed.tasks) ? parsed.tasks
        : Array.isArray(parsed.schedule) ? parsed.schedule
          : [];
  if (!source.length) throw new Error('The JSON file does not contain an activities, tasks, or schedule array.');
  const records = source.map((item, index) => {
    const normalized = {};
    Object.entries(item || {}).forEach(([key, value]) => {
      const role = smartHeaderRole(key);
      if (role) normalized[role] = Array.isArray(value) ? value.join('; ') : String(value ?? '');
    });
    normalized.rawText = Object.values(item || {}).filter((value) => value !== null && value !== undefined).join(' | ');
    normalized.name = normalized.name || String(item.name || item.title || item.task || item.activity || normalized.rawText);
    normalized.sourceLabel = 'JSON';
    normalized.sourceRow = index + 1;
    return normalized;
  });
  return smartScheduleFromRecords(records, fileName, 'JSON', { projectName: parsed.projectName || parsed.project?.name || fileName.replace(/\.[^.]+$/, '') });
}

function smartParseDelimitedText(text, fileName, delimiter) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  const matrix = lines.map((line) => delimiter ? line.split(delimiter) : smartSplitTextLine(line));
  const records = smartRecordsFromMatrix(matrix, smartDocumentExtension(fileName).toUpperCase());
  return smartScheduleFromRecords(records, fileName, smartDocumentExtension(fileName).toUpperCase());
}

parseP6File = async function parseP6OrSmartScheduleDocument(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Choose a schedule file.');
  if (file.size > SMART_SCHEDULE_MAX_FILE_BYTES) throw new Error('The schedule file is larger than 35 MB. Export a smaller schedule or filtered report.');
  const extension = smartDocumentExtension(file.name);

  if (extension === 'pdf' || file.type === 'application/pdf') return smartParsePdfSchedule(file);
  if (SMART_SPREADSHEET_EXTENSIONS.has(extension)) return smartParseSpreadsheetSchedule(file);
  if (extension === 'json' || file.type === 'application/json') return smartParseJsonSchedule(await file.text(), file.name);
  if (extension === 'tsv') return smartParseDelimitedText(await file.text(), file.name, '\t');
  if (extension === 'html' || extension === 'htm') {
    const text = (await file.text()).replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/tr>/gi, '\n').replace(/<\/t[dh]>/gi, '\t').replace(/<[^>]+>/g, ' ');
    return smartParseDelimitedText(text, file.name, null);
  }
  return smartScheduleParseP6FileBase(file);
};
