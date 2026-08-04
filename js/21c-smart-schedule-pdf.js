'use strict';

async function smartLoadPdfJs() {
  if (!smartPdfJsPromise) {
    smartPdfJsPromise = import(SMART_PDFJS_MODULE_URL)
      .then((module) => {
        if (module.GlobalWorkerOptions) module.GlobalWorkerOptions.workerSrc = SMART_PDFJS_WORKER_URL;
        return module;
      })
      .catch((error) => {
        smartPdfJsPromise = null;
        console.warn('TradeSYNC could not load PDF.js.', error);
        throw new Error('The PDF reader could not load. Check your internet connection and try again.');
      });
  }
  return smartPdfJsPromise;
}

async function smartLoadSheetJs() {
  if (globalThis.XLSX?.read && globalThis.XLSX?.utils) return globalThis.XLSX;
  if (!smartSheetJsPromise) {
    smartSheetJsPromise = import(SMART_SHEETJS_MODULE_URL)
      .then((module) => module.default?.read ? module.default : module)
      .catch((error) => {
        smartSheetJsPromise = null;
        console.warn('TradeSYNC could not load SheetJS.', error);
        throw new Error('The Excel reader could not load. Check your internet connection and try again.');
      });
  }
  return smartSheetJsPromise;
}

function smartPdfLineFromItems(items) {
  const ordered = items.slice().sort((a, b) => (a.x - b.x));
  let result = '';
  let previousEnd = null;
  let previousHeight = 10;
  ordered.forEach((item) => {
    const text = String(item.text || '').trim();
    if (!text) return;
    if (previousEnd !== null) {
      const gap = item.x - previousEnd;
      result += gap > Math.max(16, previousHeight * 1.6) ? '\t' : ' ';
    }
    result += text;
    previousEnd = item.x + Math.max(item.width || text.length * 4, 1);
    previousHeight = Math.max(item.height || previousHeight, 1);
  });
  return result.replace(/\s+\t/g, '\t').replace(/\t\s+/g, '\t').trim();
}

function smartPdfPageLines(textContent) {
  const items = (textContent.items || [])
    .filter((item) => item && typeof item.str === 'string' && item.str.trim())
    .map((item) => ({
      text: item.str,
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0),
      width: Number(item.width || 0),
      height: Math.abs(Number(item.transform?.[3] || item.height || 10))
    }))
    .sort((a, b) => (b.y - a.y) || (a.x - b.x));

  const lines = [];
  for (const item of items) {
    const tolerance = Math.max(2.25, item.height * 0.24);
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }
  return lines.sort((a, b) => b.y - a.y).map((line) => smartPdfLineFromItems(line.items)).filter(Boolean);
}

async function smartParsePdfSchedule(file) {
  const pdfjsLib = await smartLoadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false });
  const pdf = await loadingTask.promise;
  const matrix = [];
  const textLines = [];
  let textCharacterCount = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
    const lines = smartPdfPageLines(content);
    lines.forEach((line) => {
      textCharacterCount += line.replace(/\s/g, '').length;
      textLines.push(line);
      matrix.push(smartSplitTextLine(line));
    });
  }

  let metadata = {};
  try {
    const details = await pdf.getMetadata();
    metadata = { projectName: details?.info?.Title || '' };
  } catch (error) {
    console.warn('TradeSYNC could not read PDF metadata.', error);
  }
  await loadingTask.destroy();

  if (textCharacterCount < 40) {
    throw new Error('This PDF appears to be scanned or image-only. Export a searchable PDF or use the original Excel/P6 schedule file.');
  }

  let records = smartRecordsFromMatrix(matrix, 'PDF');
  if (!records.length) {
    records = textLines
      .filter(smartLooksLikeActivity)
      .map((line, index) => ({ rawText: line, name: line, sourceLabel: 'PDF', sourceRow: index + 1 }));
  }
  return smartScheduleFromRecords(records, file.name, 'PDF', metadata);
}
