function renderImageUploadField({ id, name, label = 'Add images', help = 'Optional. Up to 4 JPG, PNG, WEBP, or GIF images.' }) {
  return `<div class="field field--full image-upload-field"><label for="${escapeHtml(id)}">${escapeHtml(label)}</label><label class="image-upload-control" for="${escapeHtml(id)}">${icon('upload')}<span>Choose images</span><input id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple /></label><div class="field-help">${escapeHtml(help)}</div></div>`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('The selected image could not be opened.'));
    image.onload = () => resolve(image);
    image.src = dataUrl;
  });
}

async function compressImageFile(file) {
  if (!COLLABORATION_IMAGE_TYPES.has(file.type)) throw new Error(`${file.name} is not a supported image type.`);
  if (file.size > COLLABORATION_MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 8 MB.`);
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the image.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return {
    id: nextId('img'),
    name: file.name,
    type: 'image/jpeg',
    dataUrl: canvas.toDataURL('image/jpeg', 0.76),
    createdAt: new Date().toISOString()
  };
}

function imageFilesFromForm(formData, fieldName) {
  if (typeof File === 'undefined') return [];
  return formData.getAll(fieldName).filter((value) => value instanceof File && value.size > 0);
}

async function attachmentsFromForm(formData, fieldName) {
  const files = imageFilesFromForm(formData, fieldName);
  if (files.length > COLLABORATION_MAX_IMAGES) throw new Error('Choose no more than 4 images at a time.');
  const attachments = [];
  for (const file of files) attachments.push(await compressImageFile(file));
  return attachments;
}

function persistWithRollback(rollback) {
  try {
    saveData();
    return true;
  } catch (error) {
    console.warn('TradeSYNC could not save image documentation.', error);
    if (rollback) rollback();
    toast('The images could not be saved. Try fewer or smaller images.');
    return false;
  }
}

