'use strict';

const STORAGE_KEY = 'tradesync-demo-v1';
const CURRENT_USER = 'James Clark';

const TRADE_META = [
  { name: 'Electrical', symbol: '⚡', assignee: 'J. Smith' },
  { name: 'HVAC', symbol: '❄', assignee: 'M. Turner' },
  { name: 'Drywall', symbol: '▥', assignee: 'L. Johnson' },
  { name: 'Plumbing', symbol: '●', assignee: 'A. Rivera' },
  { name: 'Fire Protection', symbol: '♨', assignee: 'S. Patel' },
  { name: 'Finishes', symbol: '◒', assignee: 'K. Brown' },
  { name: 'Flooring', symbol: '▱', assignee: 'D. Lee' },
  { name: 'Doors', symbol: '▯', assignee: 'R. Wilson' },
  { name: 'Low Voltage', symbol: '⌁', assignee: CURRENT_USER },
  { name: 'Millwork', symbol: '⌂', assignee: CURRENT_USER }
];

const ICONS = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  tasks: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/>',
  inspections: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-5"/>',
  constraints: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 10h8M8 14h5"/><path d="M17 16v4M15 18h4"/>',
  more: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  filter: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  sliders: '<path d="M4 6h6M14 6h6M10 4v4M4 12h10M18 12h2M14 10v4M4 18h3M11 18h9M7 16v4"/>',
  building: '<path d="M3 21h18M6 21V4h12v17M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  minus: '<path d="M5 12h14"/>',
  bolt: '<path d="m13 2-9 12h8l-1 8 9-12h-8z"/>',
  room: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h8M16 3v18M13 12h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  comment: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
  alert: '<path d="M10.3 3.5 2.4 17.2A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.8L13.7 3.5a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  inbox: '<path d="M4 4h16v16H4z"/><path d="M4 14h4l2 3h4l2-3h4"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
  external: '<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/>'
};

function icon(name, className = '') {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.more}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dateOffset(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
}

function daysFromToday(iso) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const target = new Date(`${iso}T12:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function dueLabel(iso) {
  const days = daysFromToday(iso);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}

function progressColor(percent) {
  if (percent >= 70) return 'var(--green)';
  if (percent >= 25) return 'var(--orange)';
  return 'var(--navy)';
}

function makeProgress(percent, color = progressColor(percent)) {
  const safe = clamp(Math.round(percent), 0, 100);
  return `<div class="progress-track" aria-label="${safe}% complete"><span class="progress-fill" style="--progress:${safe}%;--progress-color:${color}"></span></div>`;
}

function makeRooms() {
  const namedRooms = {
    201: 'Open Office',
    202: 'Conference Room A',
    203: 'Conference Room B',
    204: 'Private Office 1',
    205: 'Private Office 2',
    206: 'Break Room',
    207: 'Restroom (M)',
    208: 'Restroom (W)',
    209: 'Electrical Room',
    210: 'Storage Room',
    211: 'Training Room',
    212: 'Reception'
  };
  const locations = ['North Wing', 'South Wing', 'East Wing', 'West Wing', 'Core'];
  const progressPattern = [100, 100, 60, 100, 70, 100, 0, 0, 100, 30, 45, 80, 10, 90, 55, 20];
  return Array.from({ length: 72 }, (_, index) => {
    const number = 201 + index;
    const progress = progressPattern[index % progressPattern.length];
    return {
      id: String(number),
      number: String(number),
      name: namedRooms[number] || `${index % 5 === 0 ? 'Conference Room' : index % 4 === 0 ? 'Private Office' : 'Office'} ${number}`,
      location: locations[Math.floor(index / 14) % locations.length],
      progress,
      status: progress === 100 ? 'complete' : progress === 0 ? 'not-started' : 'incomplete',
      level: 'Level 2',
      clashes: number === 203 || number === 205 ? 2 : number % 9 === 0 ? 1 : 0
    };
  });
}

function makeTask(id, roomId, trade, title, description, status, assignee, dueDate, completedDate = null) {
  return {
    id,
    roomId,
    trade,
    title,
    description,
    status,
    assignee,
    dueDate,
    completedDate,
    updatedBy: assignee
  };
}

function makeRoom205Tasks() {
  const done = dateOffset(-3);
  const done2 = dateOffset(-2);
  return [
    makeTask('t1', '205', 'Electrical', 'Install panel feeders', 'Pull and terminate feeders to the room distribution panel.', 'complete', 'J. Smith', dateOffset(-4), done),
    makeTask('t2', '205', 'Electrical', 'Install receptacle rough-in', 'Set boxes and complete branch wiring at the east wall.', 'complete', 'J. Smith', dateOffset(-3), done),
    makeTask('t3', '205', 'Electrical', 'Test circuits', 'Megger, label, and test installed circuits.', 'complete', 'J. Smith', dateOffset(-2), done2),
    makeTask('t4', '205', 'Electrical', 'Install devices and plates', 'Install final devices and cover plates after paint.', 'complete', 'J. Smith', dateOffset(-1), done2),

    makeTask('t5', '205', 'HVAC', 'Install supply ductwork – Area A', 'Install and secure supply ductwork in the ceiling space.', 'complete', 'M. Turner', dateOffset(-4), done),
    makeTask('t6', '205', 'HVAC', 'Install VAV box', 'Set VAV box, controls, and access clearance.', 'complete', 'M. Turner', dateOffset(-3), done),
    makeTask('t7', '205', 'HVAC', 'Balance air outlets', 'Complete preliminary air balance and document readings.', 'complete', 'M. Turner', dateOffset(-1), done2),

    makeTask('t8', '205', 'Drywall', 'Frame east wall', 'Verify layout and frame wall to the approved plan.', 'complete', 'L. Johnson', dateOffset(-3), done),
    makeTask('t9', '205', 'Drywall', 'Hang gypsum board', 'Hang board on both sides and maintain rated assemblies.', 'complete', 'L. Johnson', dateOffset(-2), done2),
    makeTask('t10', '205', 'Drywall', 'Hang & tape drywall – East Wall', 'Tape joints and apply first finish coat.', 'complete', 'L. Johnson', dateOffset(1), done2),
    makeTask('t11', '205', 'Drywall', 'Sand and finish surfaces', 'Complete final coat, sanding, and touch-up.', 'in-progress', 'L. Johnson', dateOffset(3)),

    makeTask('t12', '205', 'Plumbing', 'Install domestic water rough-in', 'Complete above-ceiling water piping and supports.', 'complete', 'A. Rivera', dateOffset(-1), done2),
    makeTask('t13', '205', 'Plumbing', 'Connect sink waste and vent', 'Install waste and vent connection at casework sink.', 'in-progress', 'A. Rivera', dateOffset(2)),
    makeTask('t14', '205', 'Plumbing', 'Pressure test piping', 'Complete test after all connections are installed.', 'not-started', 'A. Rivera', dateOffset(4)),

    makeTask('t15', '205', 'Fire Protection', 'Lay out sprinkler heads', 'Confirm reflected ceiling plan locations.', 'not-started', 'S. Patel', dateOffset(3)),
    makeTask('t16', '205', 'Fire Protection', 'Install branch piping', 'Install branch line and seismic bracing.', 'not-started', 'S. Patel', dateOffset(5)),
    makeTask('t17', '205', 'Fire Protection', 'Hydrostatic test', 'Test and document completed piping.', 'not-started', 'S. Patel', dateOffset(7)),

    makeTask('t18', '205', 'Finishes', 'Prime gypsum board', 'Apply primer after final drywall acceptance.', 'complete', 'K. Brown', dateOffset(-1), done2),
    makeTask('t19', '205', 'Finishes', 'Apply finish paint', 'Apply two finish coats and complete touch-ups.', 'complete', 'K. Brown', dateOffset(1), done2),

    makeTask('t20', '205', 'Flooring', 'Prepare floor slab', 'Patch, grind, and clean substrate.', 'complete', 'D. Lee', dateOffset(-2), done),
    makeTask('t21', '205', 'Flooring', 'Install carpet tile', 'Install carpet tile and base per finish plan.', 'complete', 'D. Lee', dateOffset(1), done2),

    makeTask('t22', '205', 'Doors', 'Install door and frame', 'Set frame, hang leaf, and adjust clearances.', 'complete', 'R. Wilson', dateOffset(-2), done),
    makeTask('t23', '205', 'Doors', 'Install hardware', 'Install lever, closer, and access control hardware.', 'complete', 'R. Wilson', dateOffset(1), done2),

    makeTask('t24', '205', 'Low Voltage', 'Terminate data outlets', 'Terminate and label data cables at workstations.', 'complete', CURRENT_USER, dateOffset(1), done2),
    makeTask('t25', '205', 'Millwork', 'Install base cabinet', 'Set, level, and secure casework at the west wall.', 'complete', CURRENT_USER, dateOffset(2), done2)
  ];
}

function makeInspection(id, trade, title, description, status, assignee, scheduledOffset, completedOffset = null, comment = '') {
  return {
    id,
    trade,
    title,
    description,
    status,
    assignee,
    scheduled: dateOffset(scheduledOffset),
    completed: completedOffset === null ? null : dateOffset(completedOffset),
    comment
  };
}

function makeInspections() {
  const specs = {
    Electrical: { passed: 5, failed: 1, pending: 1, names: ['Rough-In Wiring', 'Panel Clearances', 'Device Boxes', 'Above-Ceiling Supports', 'Grounding & Bonding', 'Final Electrical', 'Owner Witness Test'] },
    HVAC: { passed: 4, failed: 1, pending: 0, names: ['Duct Supports', 'VAV Installation', 'Controls Rough-In', 'Air Outlet Layout', 'Air Balance'] },
    Drywall: { passed: 4, failed: 1, pending: 1, names: ['GWB Joints & Fasteners', 'Openings & Penetrations', 'Surface Flatness', 'Fire-Rated Assemblies', 'Corner Bead Installation', 'Final Drywall Inspection'] },
    Plumbing: { passed: 4, failed: 1, pending: 1, names: ['Water Rough-In', 'Waste & Vent', 'Pipe Supports', 'Pressure Test', 'Fixture Connections', 'Final Plumbing'] },
    'Fire Protection': { passed: 4, failed: 1, pending: 1, names: ['Head Layout', 'Branch Piping', 'Seismic Bracing', 'Hydrostatic Test', 'Ceiling Coordination', 'Final Fire Protection'] },
    Finishes: { passed: 3, failed: 1, pending: 0, names: ['Surface Prep', 'Primer Coverage', 'Finish Coat', 'Final Touch-Up'] }
  };
  const inspections = [];
  let id = 1;
  Object.entries(specs).forEach(([trade, spec], tradeIndex) => {
    spec.names.forEach((name, index) => {
      let status = 'not-inspected';
      if (index < spec.passed) status = 'passed';
      else if (index < spec.passed + spec.failed) status = 'failed';
      const completed = status === 'not-inspected' ? null : -8 + index + tradeIndex;
      const comment = status === 'failed'
        ? `${name} did not meet the approved installation requirements. Correct the noted condition and request reinspection.`
        : '';
      inspections.push(makeInspection(
        `i${id++}`,
        trade,
        name,
        `Verify ${name.toLowerCase()} against the approved drawings and project requirements.`,
        status,
        TRADE_META.find((item) => item.name === trade)?.assignee || 'M. Turner',
        -8 + index + tradeIndex,
        completed,
        comment
      ));
    });
  });
  return inspections;
}
