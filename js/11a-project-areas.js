'use strict';

/* Building access-code onboarding and per-building interior/exterior areas. */

const projectAreaRenderModalBase = renderModal;
const projectAreaBuildDemoDataBase = buildDemoData;

const PROJECT_ACCESS_DIRECTORY = {
  '1234': {
    id: 'cosner-tech-cab',
    name: 'Cosner Tech - CAB',
    address: '400 Innovation Drive, Austin, TX',
    dueOffset: 210,
    progress: 0,
    image: 'assets/building-pioneer.jpg'
  }
};

function projectAreaTemplate(building, category) {
  const exterior = category === 'exterior';
  return {
    id: `area-${building.id}-${category}`,
    name: exterior ? 'Building Exterior & Structure' : 'Interior Build-Out',
    category,
    phase: exterior ? 'Structure / Shell' : 'Interior Build-Out',
    description: exterior
      ? 'Track structural framing, exterior envelope, roof, facade, and other work required before interior trades can proceed.'
      : 'Track interior rooms, corridors, cores, and finish areas after the building structure is ready.',
    attachments: [],
    createdAt: new Date().toISOString()
  };
}

function normalizeProjectArea(area, buildingId) {
  if (!area || typeof area !== 'object') return null;
  const category = area.category === 'exterior' ? 'exterior' : 'interior';
  area.id = String(area.id || nextId('area'));
  area.buildingId = String(area.buildingId || buildingId);
  area.name = String(area.name || (category === 'exterior' ? 'Exterior Area' : 'Interior Area'));
  area.category = category;
  area.phase = String(area.phase || (category === 'exterior' ? 'Structure / Shell' : 'Interior Build-Out'));
  area.description = String(area.description || '');
  area.attachments = normalizeAttachments(area.attachments);
  area.createdAt = String(area.createdAt || new Date().toISOString());
  return area;
}

function normalizeProjectBuilding(building) {
  if (!building || typeof building !== 'object') return building;
  building.accessCode = String(building.accessCode || '');
  if (!Array.isArray(building.areas)) {
    building.areas = [projectAreaTemplate(building, 'exterior'), projectAreaTemplate(building, 'interior')];
  }
  building.areas = building.areas.map((area) => normalizeProjectArea(area, building.id)).filter(Boolean);
  if (!building.areas.some((area) => area.category === 'exterior')) building.areas.unshift(projectAreaTemplate(building, 'exterior'));
  if (!building.areas.some((area) => area.category === 'interior')) building.areas.push(projectAreaTemplate(building, 'interior'));
  return building;
}

function normalizeProjectBuildings(target) {
  (target.buildings || []).forEach(normalizeProjectBuilding);
  return target;
}

buildDemoData = function buildDemoDataWithProjectAreas() {
  return normalizeProjectBuildings(projectAreaBuildDemoDataBase());
};

normalizeProjectBuildings(data);
try {
  saveData();
} catch (error) {
  console.warn('TradeSYNC could not save the building-area migration.', error);
}

function findProjectBuilding(buildingId) {
  return data.buildings.find((building) => building.id === buildingId) || null;
}

function projectAreaCounts(building) {
  normalizeProjectBuilding(building);
  return {
    exterior: building.areas.filter((area) => area.category === 'exterior').length,
    interior: building.areas.filter((area) => area.category === 'interior').length,
    total: building.areas.length
  };
}

renderBuildingCard = function renderBuildingCardWithAreas(building) {
  normalizeProjectBuilding(building);
  const days = daysFromToday(building.dueDate);
  const counts = projectAreaCounts(building);
  return `
    <article class="building-card building-card--with-areas">
      <button class="building-card__project" type="button" data-action="select-building" data-building="${escapeHtml(building.id)}">
        <img class="building-card__image" src="${escapeHtml(building.image)}" alt="${escapeHtml(building.name)}" />
        <span class="building-card__content">
          <span class="building-card__title">${escapeHtml(building.name)}</span>
          <span class="small muted">${escapeHtml(building.address)}</span>
          <span class="building-card__meta">${icon('calendar')}<span>Due: <strong class="${days < 0 ? 'text-red' : ''}">${formatDate(building.dueDate)}</strong></span></span>
          <span class="progress-row">${makeProgress(building.progress)}<span class="progress-number">${building.progress}%</span></span>
        </span>
        <span class="building-card__chevron" aria-hidden="true">${icon('chevron')}</span>
      </button>
      <div class="building-card__area-footer">
        <span class="building-card__area-count">${icon('building')} ${counts.exterior} exterior · ${counts.interior} interior</span>
        <button class="button button--secondary project-area-open-button" type="button" data-action="open-building-areas" data-building="${escapeHtml(building.id)}">Areas & Sections</button>
      </div>
    </article>`;
};

renderProjectStrip = function renderProjectStripWithAreas() {
  const building = selectedBuilding();
  normalizeProjectBuilding(building);
  const counts = projectAreaCounts(building);
  return `
    <section class="project-strip project-strip--with-areas">
      <img class="project-strip__image" src="${escapeHtml(building.image)}" alt="${escapeHtml(building.name)}" />
      <div class="project-strip__identity">
        <h2 class="no-margin">${escapeHtml(building.name)}</h2>
        <p class="muted small no-margin">${counts.exterior} exterior · ${counts.interior} interior areas</p>
      </div>
      <div class="project-strip__due">
        <div class="small">Due: <strong class="text-red">${formatDate(building.dueDate)}</strong></div>
        <div class="small muted" style="margin-top:5px">${dueLabel(building.dueDate)}</div>
      </div>
      <button class="button button--secondary project-strip__areas-button" type="button" data-action="open-building-areas" data-building="${escapeHtml(building.id)}">Areas & Sections</button>
    </section>`;
};

function renderBuildingCodeModal() {
  return modalShell('Add Building by Access Code', `
    <form id="add-building-code-form" class="form-grid">
      <div class="field field--full">
        <label for="building-access-code">Building access code</label>
        <input class="input building-code-input" id="building-access-code" name="accessCode" required inputmode="numeric" autocomplete="one-time-code" placeholder="Enter project code" maxlength="12" />
        <div class="field-help">The code loads the approved building name, address, turnover date, and starting project information.</div>
      </div>
      <div class="building-code-example field--full">
        <span class="building-code-example__code">1234</span>
        <span><strong>Demo access code</strong><small>Cosner Tech - CAB</small></span>
      </div>
    </form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Cancel</button><button class="button button--primary" type="submit" form="add-building-code-form">Add Building</button>`);
}

function renderProjectAreaCard(area) {
  const categoryLabel = area.category === 'exterior' ? 'Exterior' : 'Interior';
  return `
    <article class="project-area-card">
      <div class="project-area-card__head">
        <span class="project-area-card__type project-area-card__type--${area.category}">${categoryLabel}</span>
        <span class="small muted">${escapeHtml(area.phase)}</span>
      </div>
      <h3>${escapeHtml(area.name)}</h3>
      <p class="muted small">${escapeHtml(area.description || 'No description added.')}</p>
      ${area.attachments.length ? renderAttachmentGallery(area.attachments, true) : `<div class="project-area-card__empty-image">${icon('upload')} No images uploaded</div>`}
    </article>`;
}

function renderBuildingAreasModal() {
  const building = findProjectBuilding(ui.modal?.buildingId) || selectedBuilding();
  if (!building) return '';
  normalizeProjectBuilding(building);
  const exterior = building.areas.filter((area) => area.category === 'exterior');
  const interior = building.areas.filter((area) => area.category === 'interior');
  const body = `
    <div class="building-area-modal__header">
      <img src="${escapeHtml(building.image)}" alt="" />
      <div><strong>${escapeHtml(building.name)}</strong><span>${escapeHtml(building.address)}</span></div>
    </div>
    <p class="building-area-explanation">Exterior areas support structure, shell, facade, roof, and enclosure work. Interior areas support room and finish coordination after the structure is ready.</p>
    <section class="building-area-group">
      <div class="documentation-section__head"><h3>Exterior Areas / Sections</h3><span class="count-pill">${exterior.length}</span></div>
      <div class="project-area-grid">${exterior.map(renderProjectAreaCard).join('')}</div>
    </section>
    <section class="building-area-group">
      <div class="documentation-section__head"><h3>Interior Areas / Sections</h3><span class="count-pill">${interior.length}</span></div>
      <div class="project-area-grid">${interior.map(renderProjectAreaCard).join('')}</div>
    </section>`;
  const footer = `<button class="button button--secondary" type="button" data-action="close-modal">Close</button><button class="button button--primary" type="button" data-action="open-add-building-area" data-building="${escapeHtml(building.id)}">${icon('plus')}Add Area / Section</button>`;
  return modalShell(`${building.name} Areas`, body, footer);
}

function renderAddBuildingAreaModal() {
  const building = findProjectBuilding(ui.modal?.buildingId) || selectedBuilding();
  if (!building) return '';
  return modalShell(`Add Area to ${building.name}`, `
    <form id="add-building-area-form" class="form-grid">
      <input type="hidden" name="buildingId" value="${escapeHtml(building.id)}" />
      <div class="field field--full"><label for="project-area-name">Area or section name</label><input class="input" id="project-area-name" name="name" required placeholder="Example: North Elevation or Level 1 Core" /></div>
      <div class="field"><label for="project-area-category">Location type</label><select class="select" id="project-area-category" name="category"><option value="exterior">Exterior Area / Section</option><option value="interior">Interior Area / Section</option></select></div>
      <div class="field"><label for="project-area-phase">Project phase</label><select class="select" id="project-area-phase" name="phase"><option>Structure / Shell</option><option>Exterior Envelope</option><option>Roofing</option><option>Interior Build-Out</option><option>MEP Rough-In</option><option>Finishes</option><option>Closeout</option></select></div>
      <div class="field field--full"><label for="project-area-description">Description</label><textarea class="textarea" id="project-area-description" name="description" required placeholder="Describe the limits of this area and the work tracked here"></textarea></div>
      ${renderImageUploadField({ id: 'project-area-images', name: 'projectAreaImages', label: 'Area images', help: 'Optional. Upload site photos, elevations, plans, or marked-up area images.' })}
    </form>`, `<button class="button button--secondary" type="button" data-action="back-to-building-areas" data-building="${escapeHtml(building.id)}">Back</button><button class="button button--primary" type="submit" form="add-building-area-form">Add Area / Section</button>`);
}

renderModal = function renderModalWithBuildingAreas() {
  if (!ui.modal) return '';
  if (ui.modal.type === 'add-building') return renderBuildingCodeModal();
  if (ui.modal.type === 'building-areas') return renderBuildingAreasModal();
  if (ui.modal.type === 'add-building-area') return renderAddBuildingAreaModal();
  return projectAreaRenderModalBase();
};

function addBuildingFromAccessCode(formData) {
  const code = String(formData.get('accessCode') || '').replace(/\s+/g, '');
  const record = PROJECT_ACCESS_DIRECTORY[code];
  if (!record) {
    toast('That building access code was not found. Use 1234 for the Cosner Tech - CAB demo project.');
    return;
  }
  const existing = data.buildings.find((building) => building.id === record.id || building.accessCode === code);
  if (existing) {
    ui.selectedBuildingId = existing.id;
    ui.modal = null;
    render();
    toast(`${existing.name} is already in My Buildings.`);
    return;
  }
  const building = normalizeProjectBuilding({
    id: record.id,
    accessCode: code,
    name: record.name,
    address: record.address,
    dueDate: dateOffset(record.dueOffset),
    progress: record.progress,
    image: record.image,
    areas: []
  });
  data.buildings.push(building);
  ui.selectedBuildingId = building.id;
  saveData();
  ui.modal = null;
  render();
  toast(`${building.name} was added from access code ${code}.`);
}

async function addBuildingAreaFromForm(formData) {
  try {
    const building = findProjectBuilding(String(formData.get('buildingId')));
    if (!building) return;
    const attachments = await attachmentsFromForm(formData, 'projectAreaImages');
    const area = normalizeProjectArea({
      id: nextId('area'),
      buildingId: building.id,
      name: String(formData.get('name') || '').trim(),
      category: String(formData.get('category')) === 'exterior' ? 'exterior' : 'interior',
      phase: String(formData.get('phase') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      attachments,
      createdAt: new Date().toISOString()
    }, building.id);
    building.areas.push(area);
    if (!persistWithRollback(() => {
      const index = building.areas.indexOf(area);
      if (index >= 0) building.areas.splice(index, 1);
    })) return;
    ui.modal = { type: 'building-areas', buildingId: building.id };
    render();
    toast(`${area.name} was added to ${building.name}.`);
  } catch (error) {
    console.warn('TradeSYNC could not add the building area.', error);
    toast(error.message || 'The area could not be added.');
  }
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === 'open-building-areas') {
    event.preventDefault();
    event.stopImmediatePropagation();
    const buildingId = trigger.dataset.building || ui.selectedBuildingId;
    ui.selectedBuildingId = buildingId;
    openModal('building-areas', { buildingId });
  } else if (action === 'open-add-building-area') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('add-building-area', { buildingId: trigger.dataset.building || ui.selectedBuildingId });
  } else if (action === 'back-to-building-areas') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal('building-areas', { buildingId: trigger.dataset.building || ui.selectedBuildingId });
  }
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.id === 'add-building-code-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    addBuildingFromAccessCode(new FormData(form));
  } else if (form.id === 'add-building-area-form') {
    event.preventDefault();
    event.stopImmediatePropagation();
    addBuildingAreaFromForm(new FormData(form));
  }
}, true);

if (['home', 'rooms', 'inspections'].includes(route().view)) render();
