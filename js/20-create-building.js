'use strict';

/* Create a new building or join an existing building from the Home page. */

const createBuildingRenderModalBase = renderModal;
const createBuildingRenderHomeBase = renderHome;
const createBuildingBuildDemoDataBase = buildDemoData;

const CREATE_BUILDING_CODE_MIN_LENGTH = 4;
const CREATE_BUILDING_CODE_MAX_LENGTH = 12;

function normalizeCreatedBuildingDirectory(target) {
  if (!target.createdBuildingDirectory || typeof target.createdBuildingDirectory !== 'object' || Array.isArray(target.createdBuildingDirectory)) {
    target.createdBuildingDirectory = {};
  }
  Object.entries(target.createdBuildingDirectory).forEach(([code, record]) => {
    if (!record || typeof record !== 'object') {
      delete target.createdBuildingDirectory[code];
      return;
    }
    const cleanCode = String(record.accessCode || code).replace(/\D/g, '').slice(0, CREATE_BUILDING_CODE_MAX_LENGTH);
    if (cleanCode.length < CREATE_BUILDING_CODE_MIN_LENGTH) {
      delete target.createdBuildingDirectory[code];
      return;
    }
    const normalized = {
      id: String(record.id || `building-${cleanCode}`),
      accessCode: cleanCode,
      name: String(record.name || 'Untitled Building'),
      address: String(record.address || ''),
      dueDate: String(record.dueDate || dateOffset(90)),
      progress: clamp(Number(record.progress) || 0, 0, 100),
      image: String(record.image || 'assets/building-riverside.jpg'),
      projectNumber: String(record.projectNumber || ''),
      projectType: String(record.projectType || 'Commercial'),
      interiorName: String(record.interiorName || 'Interior Build-Out'),
      exteriorName: String(record.exteriorName || 'Building Exterior & Structure'),
      createdAt: String(record.createdAt || new Date().toISOString()),
      createdBy: String(record.createdBy || CURRENT_USER)
    };
    if (code !== cleanCode) delete target.createdBuildingDirectory[code];
    target.createdBuildingDirectory[cleanCode] = normalized;
  });
  return target;
}

buildDemoData = function buildDemoDataWithCreatedBuildingDirectory() {
  return normalizeCreatedBuildingDirectory(createBuildingBuildDemoDataBase());
};

normalizeCreatedBuildingDirectory(data);
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not save the building-directory migration.', error);
}

function createdBuildingDirectory() {
  normalizeCreatedBuildingDirectory(data);
  return data.createdBuildingDirectory;
}

function cleanBuildingAccessCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, CREATE_BUILDING_CODE_MAX_LENGTH);
}

function buildingAccessCodeRecord(code) {
  const cleanCode = cleanBuildingAccessCode(code);
  if (!cleanCode) return null;
  const localRecord = createdBuildingDirectory()[cleanCode];
  if (localRecord) return { ...localRecord, source: 'created' };
  const approvedRecord = typeof PROJECT_ACCESS_DIRECTORY !== 'undefined' ? PROJECT_ACCESS_DIRECTORY[cleanCode] : null;
  return approvedRecord ? { ...approvedRecord, accessCode: cleanCode, source: 'approved' } : null;
}

function buildingAccessCodeInUse(code) {
  const cleanCode = cleanBuildingAccessCode(code);
  if (!cleanCode) return false;
  if (buildingAccessCodeRecord(cleanCode)) return true;
  return data.buildings.some((building) => cleanBuildingAccessCode(building.accessCode) === cleanCode);
}

function generateBuildingAccessCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let value;
    if (globalThis.crypto?.getRandomValues) {
      const buffer = new Uint32Array(1);
      globalThis.crypto.getRandomValues(buffer);
      value = 100000 + (buffer[0] % 900000);
    } else {
      value = Math.floor(100000 + Math.random() * 900000);
    }
    const code = String(value);
    if (!buildingAccessCodeInUse(code)) return code;
  }
  return String(Date.now()).slice(-8);
}

function createBuildingDraftCode() {
  const current = cleanBuildingAccessCode(ui.createBuildingDraftCode);
  if (current.length >= CREATE_BUILDING_CODE_MIN_LENGTH && !buildingAccessCodeInUse(current)) return current;
  ui.createBuildingDraftCode = generateBuildingAccessCode();
  return ui.createBuildingDraftCode;
}

function createdBuildingFallbackImage() {
  const images = [
    'assets/building-riverside.jpg',
    'assets/building-maplewood.jpg',
    'assets/building-westview.jpg',
    'assets/building-pioneer.jpg'
  ];
  return images[data.buildings.length % images.length];
}

function renderAddBuildingChoiceModal() {
  return modalShell('Add a Building', `
    <div class="building-onboarding-intro">
      <span>${icon('building')}</span>
      <div><strong>How do you want to add the project?</strong><p>Create a new building when you are setting up the project. Join an existing building when another project administrator gave you an access code.</p></div>
    </div>
    <div class="building-onboarding-options">
      <button class="building-onboarding-option building-onboarding-option--create" type="button" data-action="open-create-building">
        <span class="building-onboarding-option__icon">${icon('plus')}</span>
        <span><strong>Create New Building</strong><small>Enter the project information, create an access code, and start adding Interior or Exterior locations.</small></span>
        ${icon('chevron')}
      </button>
      <button class="building-onboarding-option" type="button" data-action="open-join-building">
        <span class="building-onboarding-option__icon">${icon('building')}</span>
        <span><strong>Join Existing Building</strong><small>Use a project access code to load an approved or previously created building.</small></span>
        ${icon('chevron')}
      </button>
    </div>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button>`);
}

function renderJoinBuildingModal() {
  return modalShell('Join Existing Building', `
    <form id="add-building-code-form" class="form-grid">
      <div class="field field--full">
        <label for="building-access-code">Building access code</label>
        <input class="input building-code-input" id="building-access-code" name="accessCode" required inputmode="numeric" autocomplete="one-time-code" placeholder="Enter project code" minlength="${CREATE_BUILDING_CODE_MIN_LENGTH}" maxlength="${CREATE_BUILDING_CODE_MAX_LENGTH}" />
        <div class="field-help">Enter a code created by a project administrator. The code loads the building name, address, turnover date, and starting locations.</div>
      </div>
      <div class="building-code-example field--full">
        <span class="building-code-example__code">1234</span>
        <span><strong>Demo access code</strong><small>Cosner Tech - CAB</small></span>
      </div>
    </form>`, `<button class="button button--secondary" type="button" data-action="back-to-add-building">Back</button><button class="button button--primary" type="submit" form="add-building-code-form">Join Building</button>`);
}

function renderCreateBuildingModal() {
  const code = createBuildingDraftCode();
  return modalShell('Create New Building', `
    <form id="create-building-form" class="form-grid">
      <div class="field field--full create-building-context">
        <span>${icon('building')}</span>
        <div><strong>Set up the project once</strong><small>TradeSYNC automatically creates separate Interior and Exterior starting locations. Rooms and work areas can be added after the building is created.</small></div>
      </div>
      <div class="field field--full"><label for="create-building-name">Building name</label><input class="input" id="create-building-name" name="name" required maxlength="100" placeholder="Example: Cosner Tech - CAB" /></div>
      <div class="field"><label for="create-building-project-number">Project number <span class="muted">(optional)</span></label><input class="input" id="create-building-project-number" name="projectNumber" maxlength="40" placeholder="Example: 24-001" /></div>
      <div class="field"><label for="create-building-project-type">Project type</label><select class="select" id="create-building-project-type" name="projectType"><option>Commercial</option><option>Data Center</option><option>Healthcare</option><option>Education</option><option>Residential</option><option>Industrial</option><option>Other</option></select></div>
      <div class="field field--full"><label for="create-building-address">Address</label><input class="input" id="create-building-address" name="address" required maxlength="180" placeholder="Street, city, state" /></div>
      <div class="field"><label for="create-building-turnover">Planned turnover date</label><input class="input" id="create-building-turnover" name="dueDate" type="date" required value="${dateOffset(180)}" /></div>
      <div class="field"><label for="create-building-code">Access code</label><div class="create-building-code-row"><input class="input building-code-input" id="create-building-code" name="accessCode" required inputmode="numeric" minlength="${CREATE_BUILDING_CODE_MIN_LENGTH}" maxlength="${CREATE_BUILDING_CODE_MAX_LENGTH}" value="${escapeHtml(code)}" /><button class="button button--secondary button--small" type="button" data-action="generate-building-code">Generate</button></div><div class="field-help">Share this code with people who need to join the building. Codes must contain 4-12 numbers and be unique.</div></div>
      <details class="create-building-locations field--full">
        <summary>Starting locations</summary>
        <div class="create-building-locations__grid">
          <div class="field"><label for="create-building-interior-name">Interior starting location</label><input class="input" id="create-building-interior-name" name="interiorName" value="Interior Build-Out" maxlength="80" /></div>
          <div class="field"><label for="create-building-exterior-name">Exterior starting location</label><input class="input" id="create-building-exterior-name" name="exteriorName" value="Building Exterior & Structure" maxlength="80" /></div>
        </div>
      </details>
      <div class="field field--full create-building-image-field">
        <label for="create-building-image">Building image <span class="muted">(optional)</span></label>
        <label class="create-building-image-upload" for="create-building-image">${icon('upload')}<span><strong>Choose a project image</strong><small>JPG, PNG, WEBP, or GIF up to 8 MB</small></span><input id="create-building-image" name="buildingImage" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
        <div class="create-building-image-preview" data-create-building-image-preview><span>${icon('building')}A default building image will be used.</span></div>
      </div>
    </form>`, `<button class="button button--secondary" type="button" data-action="back-to-add-building">Back</button><button class="button button--primary" type="submit" form="create-building-form">${icon('plus')}Create Building</button>`);
}

function renderBuildingCreatedModal() {
  const building = findProjectBuilding(ui.modal?.buildingId);
  if (!building) return '';
  const code = cleanBuildingAccessCode(building.accessCode);
  return modalShell('Building Created', `
    <div class="building-created-success">
      <span>${icon('check')}</span>
      <div><strong>${escapeHtml(building.name)}</strong><small>${escapeHtml(building.address)}</small></div>
    </div>
    <div class="building-created-code">
      <span>Building Access Code</span>
      <strong>${escapeHtml(code)}</strong>
      <button class="button button--secondary button--small" type="button" data-action="copy-created-building-code" data-code="${escapeHtml(code)}">Copy Code</button>
    </div>
    <p class="building-created-help">The building now has separate Interior and Exterior starting locations. Continue to choose a section, add locations, and add rooms or exterior work areas.</p>
    <div class="building-created-sections"><span>${icon('room')}Interior</span><span>${icon('building')}Exterior</span></div>
    <div class="building-created-prototype-note"><strong>Prototype note:</strong> This access code is stored in this browser. Joining from another phone or computer will require the future shared TradeSYNC backend.</div>`, `<button class="button button--secondary" type="button" data-action="close-modal">Return Home</button><button class="button button--primary" type="button" data-action="continue-created-building" data-building="${escapeHtml(building.id)}">Set Up Building</button>`);
}

renderModal = function renderModalWithBuildingCreation() {
  if (!ui.modal) return '';
  if (ui.modal.type === 'add-building') return renderAddBuildingChoiceModal();
  if (ui.modal.type === 'join-building') return renderJoinBuildingModal();
  if (ui.modal.type === 'create-building') return renderCreateBuildingModal();
  if (ui.modal.type === 'building-created') return renderBuildingCreatedModal();
  return createBuildingRenderModalBase();
};

renderHome = function renderHomeWithCreateOrJoinLabel() {
  return createBuildingRenderHomeBase().replace('Add Building</button>', 'Create / Join Building</button>');
};

function accessRecordDueDate(record) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(record.dueDate || ''))) return record.dueDate;
  return dateOffset(Number(record.dueOffset) || 90);
}

addBuildingFromAccessCode = function joinBuildingFromApprovedOrCreatedCode(formData) {
  const code = cleanBuildingAccessCode(formData.get('accessCode'));
  const record = buildingAccessCodeRecord(code);
  if (!record) {
    toast('That building access code was not found. Use 1234 for the Cosner Tech - CAB demo project.');
    return;
  }
  const existing = data.buildings.find((building) => building.id === record.id || cleanBuildingAccessCode(building.accessCode) === code);
  if (existing) {
    ui.selectedBuildingId = existing.id;
    setBuildingAreaTab(existing.id, 'interior');
    ui.roomCategoryFilter = 'interior';
    ui.modal = { type: 'building-section-choice', buildingId: existing.id };
    render();
    toast(`${existing.name} is already in My Buildings.`);
    return;
  }

  const building = normalizeProjectBuilding({
    id: String(record.id || `${slugify(record.name)}-${Date.now().toString(36)}`),
    accessCode: code,
    name: String(record.name || 'Untitled Building'),
    address: String(record.address || ''),
    dueDate: accessRecordDueDate(record),
    progress: clamp(Number(record.progress) || 0, 0, 100),
    image: String(record.image || createdBuildingFallbackImage()),
    projectNumber: String(record.projectNumber || ''),
    projectType: String(record.projectType || 'Commercial'),
    createdAt: String(record.createdAt || new Date().toISOString()),
    createdBy: String(record.createdBy || 'Project Administrator'),
    areas: []
  });
  const joinedInterior = building.areas.find((area) => area.category === 'interior');
  const joinedExterior = building.areas.find((area) => area.category === 'exterior');
  if (joinedInterior && record.interiorName) joinedInterior.name = String(record.interiorName);
  if (joinedExterior && record.exteriorName) joinedExterior.name = String(record.exteriorName);

  data.buildings.push(building);
  normalizeRoomBuildingData(data);
  if (typeof p6NormalizeAppData === 'function') p6NormalizeAppData(data);
  if (typeof recalculateBuildingProgress === 'function') recalculateBuildingProgress(building.id, data);
  setBuildingAreaTab(building.id, 'interior');
  ui.roomCategoryFilter = 'interior';
  ui.selectedBuildingId = building.id;
  try {
    saveData();
  } catch (error) {
    data.buildings = data.buildings.filter((item) => item !== building);
    console.warn('TradeSYNC could not save the joined building.', error);
    toast('The building could not be saved in this browser. Free storage and try again.');
    return;
  }
  ui.modal = { type: 'building-section-choice', buildingId: building.id };
  render();
  toast(`${building.name} was added with access code ${code}.`);
};

async function createBuildingFromForm(formData) {
  const name = String(formData.get('name') || '').trim();
  const address = String(formData.get('address') || '').trim();
  const dueDate = String(formData.get('dueDate') || '');
  const accessCode = cleanBuildingAccessCode(formData.get('accessCode'));
  if (!name || !address || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    toast('Add the building name, address, and planned turnover date.');
    return;
  }
  if (accessCode.length < CREATE_BUILDING_CODE_MIN_LENGTH) {
    toast('The building access code must contain at least 4 numbers.');
    return;
  }
  if (buildingAccessCodeInUse(accessCode)) {
    toast('That access code is already in use. Generate another code.');
    return;
  }

  let attachments = [];
  try {
    attachments = await attachmentsFromForm(formData, 'buildingImage');
  } catch (error) {
    console.warn('TradeSYNC could not prepare the building image.', error);
    toast(error.message || 'The building image could not be prepared.');
    return;
  }

  const idBase = slugify(name) || 'building';
  let buildingId = idBase;
  if (data.buildings.some((building) => building.id === buildingId) || Object.values(createdBuildingDirectory()).some((record) => record.id === buildingId)) {
    buildingId = `${idBase}-${Date.now().toString(36)}`;
  }
  const image = attachments[0]?.dataUrl || createdBuildingFallbackImage();
  const building = normalizeProjectBuilding({
    id: buildingId,
    accessCode,
    name,
    address,
    dueDate,
    progress: 0,
    image,
    projectNumber: String(formData.get('projectNumber') || '').trim(),
    projectType: String(formData.get('projectType') || 'Commercial'),
    createdAt: new Date().toISOString(),
    createdBy: CURRENT_USER,
    areas: []
  });

  const interiorName = String(formData.get('interiorName') || '').trim();
  const exteriorName = String(formData.get('exteriorName') || '').trim();
  const interior = building.areas.find((area) => area.category === 'interior');
  const exterior = building.areas.find((area) => area.category === 'exterior');
  if (interior && interiorName) interior.name = interiorName;
  if (exterior && exteriorName) exterior.name = exteriorName;

  const directoryRecord = {
    id: building.id,
    accessCode,
    name: building.name,
    address: building.address,
    dueDate: building.dueDate,
    progress: 0,
    image: building.image,
    projectNumber: building.projectNumber,
    projectType: building.projectType,
    interiorName: interior?.name || 'Interior Build-Out',
    exteriorName: exterior?.name || 'Building Exterior & Structure',
    createdAt: building.createdAt,
    createdBy: CURRENT_USER
  };

  data.buildings.push(building);
  createdBuildingDirectory()[accessCode] = directoryRecord;
  if (typeof normalizeRoomBuildingData === 'function') normalizeRoomBuildingData(data);
  if (typeof p6NormalizeAppData === 'function') p6NormalizeAppData(data);
  if (typeof recalculateBuildingProgress === 'function') recalculateBuildingProgress(building.id, data);
  setBuildingAreaTab(building.id, 'interior');
  ui.roomCategoryFilter = 'interior';
  ui.selectedBuildingId = building.id;

  try {
    saveData();
  } catch (error) {
    data.buildings = data.buildings.filter((item) => item !== building);
    delete createdBuildingDirectory()[accessCode];
    console.warn('TradeSYNC could not save the created building.', error);
    toast('The building could not be saved. Try a smaller image or free browser storage.');
    return;
  }

  ui.createBuildingDraftCode = '';
  ui.modal = { type: 'building-created', buildingId: building.id };
  render();
  toast(`${building.name} was created.`);
}

async function copyBuildingCode(code) {
  const value = cleanBuildingAccessCode(code);
  if (!value) return;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const input = document.createElement('textarea');
      input.value = value;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    toast(`Building access code ${value} copied.`);
  } catch (error) {
    console.warn('TradeSYNC could not copy the access code.', error);
    toast(`Building access code: ${value}`);
  }
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'open-create-building') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('create-building');
  } else if (action === 'open-join-building') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('join-building');
  } else if (action === 'back-to-add-building') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('add-building');
  } else if (action === 'generate-building-code') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const input = trigger.closest('form')?.querySelector('#create-building-code');
    const code = generateBuildingAccessCode();
    ui.createBuildingDraftCode = code;
    if (input) input.value = code;
    toast(`New access code ${code} generated.`);
  } else if (action === 'copy-created-building-code') {
    event.preventDefault();
    event.stopImmediatePropagation();
    copyBuildingCode(trigger.dataset.code);
  } else if (action === 'continue-created-building') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const buildingId = trigger.dataset.building;
    ui.selectedBuildingId = buildingId;
    ui.modal = { type: 'building-section-choice', buildingId };
    render();
  }
}, true);

document.addEventListener('change', (event) => {
  if (event.target.id !== 'create-building-image') return;
  const preview = event.target.closest('form')?.querySelector('[data-create-building-image-preview]');
  const file = event.target.files?.[0];
  if (!preview) return;
  if (!file) {
    preview.innerHTML = `<span>${icon('building')}A default building image will be used.</span>`;
    return;
  }
  if (!COLLABORATION_IMAGE_TYPES.has(file.type) || file.size > COLLABORATION_MAX_IMAGE_BYTES) {
    event.target.value = '';
    preview.innerHTML = `<span>${icon('alert')}Choose a supported image no larger than 8 MB.</span>`;
    toast('Choose a JPG, PNG, WEBP, or GIF image no larger than 8 MB.');
    return;
  }
  const url = URL.createObjectURL(file);
  preview.innerHTML = `<img src="${escapeHtml(url)}" alt="Building image preview" /><span><strong>${escapeHtml(file.name)}</strong><small>${Math.max(1, Math.round(file.size / 1024))} KB</small></span>`;
  const image = preview.querySelector('img');
  image?.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
}, true);

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'create-building-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  createBuildingFromForm(new FormData(event.target));
}, true);

if (route().view === 'home') render();
