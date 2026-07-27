function buildDemoData() {
  return {
    version: 1,
    buildings: [
      { id: 'riverside', name: 'Riverside Office Building', address: '123 River St, Austin, TX', dueDate: dateOffset(20), progress: 72, image: 'assets/building-riverside.jpg' },
      { id: 'maplewood', name: 'Maplewood Apartments', address: '456 Maple Ave, Austin, TX', dueDate: dateOffset(35), progress: 45, image: 'assets/building-maplewood.jpg' },
      { id: 'westview', name: 'Westview Elementary', address: '789 School Rd, Austin, TX', dueDate: dateOffset(-5), progress: 88, image: 'assets/building-westview.jpg' },
      { id: 'pioneer', name: 'Pioneer Medical Center', address: '321 Health Way, Austin, TX', dueDate: dateOffset(60), progress: 10, image: 'assets/building-pioneer.jpg' }
    ],
    rooms: makeRooms(),
    tasksByRoom: { '205': makeRoom205Tasks() },
    inspections: makeInspections(),
    constraints: [
      {
        id: 'c1',
        title: 'Drywall Delivery Delay',
        type: 'Schedule',
        priority: 'critical',
        status: 'active',
        description: 'Drywall material delivery is delayed by the supplier. Installation cannot begin in the south wing until materials arrive on site.',
        startDate: dateOffset(4),
        endDate: dateOffset(10),
        owner: 'L. Johnson'
      },
      {
        id: 'c2',
        title: 'Electrical Panel Clearance',
        type: 'Clash',
        priority: 'moderate',
        status: 'active',
        description: 'Millwork encroaches on the required electrical working clearance. Coordinate revised cabinet dimensions before installation.',
        startDate: dateOffset(1),
        endDate: dateOffset(5),
        owner: 'J. Smith'
      },
      {
        id: 'c3',
        title: 'Ceiling Access Panel Location',
        type: 'Coordination',
        priority: 'low',
        status: 'active',
        description: 'Confirm access panel location for the VAV controller before the ceiling grid is closed.',
        startDate: dateOffset(2),
        endDate: dateOffset(8),
        owner: 'M. Turner'
      },
      {
        id: 'c4',
        title: 'Long Lead HVAC Unit',
        type: 'Resource',
        priority: 'low',
        status: 'resolved',
        description: 'HVAC unit had a long manufacturing lead time. The unit has arrived and the installation sequence has been recovered.',
        startDate: dateOffset(-24),
        endDate: dateOffset(-16),
        owner: 'M. Turner'
      }
    ],
    messages: [
      { id: 'm1', from: 'M. Turner', subject: 'Room 205 air balance complete', body: 'Preliminary balance readings are uploaded and the HVAC trade has marked its room scope complete.', time: '8:35 AM' },
      { id: 'm2', from: 'L. Johnson', subject: 'Drywall finish coat', body: 'Final coat is in progress. We expect to request inspection tomorrow afternoon.', time: 'Yesterday' },
      { id: 'm3', from: 'J. Smith', subject: 'Panel clearance clash', body: 'Please review the revised millwork sketch attached to constraint c2.', time: 'Mon' }
    ],
    notifications: [
      { id: 'n1', title: 'Failed inspection needs correction', body: 'Corner Bead Installation was marked failed in Room 205.', type: 'failed' },
      { id: 'n2', title: 'Critical path constraint added', body: 'Drywall Delivery Delay may affect the room turnover date.', type: 'critical' },
      { id: 'n3', title: 'Trade marked complete', body: 'HVAC marked Room 205 complete.', type: 'complete' }
    ],
    activity: [
      { id: 'a1', type: 'failed', title: 'Drywall – Corner Bead Installation failed', meta: `Updated ${formatDate(dateOffset(-1))} by M. Turner` },
      { id: 'a2', type: 'passed', title: 'Electrical – Rough-In Wiring passed', meta: `Updated ${formatDate(dateOffset(-2))} by J. Smith` },
      { id: 'a3', type: 'complete', title: 'HVAC marked Room 205 complete', meta: `Updated ${formatDate(dateOffset(-2))} by M. Turner` }
    ]
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDemoData();
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) return buildDemoData();
    return parsed;
  } catch (error) {
    console.warn('TradeSYNC could not load saved demo data.', error);
    return buildDemoData();
  }
}

let data = loadData();
let ui = {
  selectedBuildingId: 'riverside',
  selectedRoomId: '205',
  roomPage: 1,
  roomFilter: 'all',
  roomSearch: '',
  taskTab: 'all',
  taskTradeFilter: 'all',
  taskView: 'trade',
  inspectionTrade: 'Drywall',
  constraintFilter: 'all',
  drawerOpen: false,
  modal: null,
  installPrompt: null
};

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextId(prefix) {
  return `${prefix}${Date.now()}${Math.random().toString(16).slice(2, 6)}`;
}

function selectedBuilding() {
  return data.buildings.find((building) => building.id === ui.selectedBuildingId) || data.buildings[0];
}

function selectedRoom() {
  return data.rooms.find((room) => room.id === ui.selectedRoomId) || data.rooms.find((room) => room.id === '205') || data.rooms[0];
}

function ensureRoomWorkspace(roomId) {
  if (data.tasksByRoom[roomId]) return;
  const room = data.rooms.find((item) => item.id === roomId);
  const base = makeRoom205Tasks();
  const desiredProgress = room?.progress ?? 0;
  const clone = base.map((task, index) => {
    const threshold = Math.round((desiredProgress / 100) * base.length);
    const status = index < threshold ? 'complete' : index === threshold && desiredProgress > 0 && desiredProgress < 100 ? 'in-progress' : 'not-started';
    return {
      ...task,
      id: nextId('t'),
      roomId,
      status,
      completedDate: status === 'complete' ? dateOffset(-2) : null
    };
  });
  data.tasksByRoom[roomId] = clone;
  saveData();
}

function roomTasks(roomId = ui.selectedRoomId) {
  ensureRoomWorkspace(roomId);
  return data.tasksByRoom[roomId] || [];
}

function tradeSummary(tradeName, roomId = ui.selectedRoomId) {
  const tasks = roomTasks(roomId).filter((task) => task.trade === tradeName);
  const complete = tasks.filter((task) => task.status === 'complete').length;
  const inProgress = tasks.filter((task) => task.status === 'in-progress').length;
  const percent = tasks.length ? Math.round((complete / tasks.length) * 100) : 0;
  let status = 'not-started';
  if (tasks.length && complete === tasks.length) status = 'complete';
  else if (complete > 0 || inProgress > 0) status = 'in-progress';
  const meta = TRADE_META.find((item) => item.name === tradeName) || { name: tradeName, symbol: '•', assignee: 'Unassigned' };
  const lastTask = [...tasks].sort((a, b) => String(b.completedDate || b.dueDate).localeCompare(String(a.completedDate || a.dueDate)))[0];
  return {
    ...meta,
    total: tasks.length,
    complete,
    percent,
    status,
    lastUpdated: lastTask?.completedDate || null,
    updatedBy: lastTask?.updatedBy || meta.assignee
  };
}

function roomTrades(roomId = ui.selectedRoomId) {
  return TRADE_META.map((trade) => tradeSummary(trade.name, roomId));
}

function syncRoomProgress(roomId = ui.selectedRoomId) {
  const trades = roomTrades(roomId);
  const completed = trades.filter((trade) => trade.status === 'complete').length;
  const percent = Math.round((completed / trades.length) * 100);
  const room = data.rooms.find((item) => item.id === roomId);
  if (room) {
    room.progress = percent;
    room.status = percent === 100 ? 'complete' : percent === 0 ? 'not-started' : 'incomplete';
  }
  if (roomId === '205') {
    const building = data.buildings.find((item) => item.id === 'riverside');
    if (building) building.progress = Math.round((building.progress * 3 + percent) / 4);
  }
  saveData();
  return percent;
}

function inspectionCounts(trade = null) {
  const list = trade ? data.inspections.filter((item) => item.trade === trade) : data.inspections;
  return {
    passed: list.filter((item) => item.status === 'passed').length,
    failed: list.filter((item) => item.status === 'failed').length,
    pending: list.filter((item) => item.status === 'not-inspected').length,
    total: list.length
  };
}

function addActivity(type, title, meta = `Updated just now by ${CURRENT_USER}`) {
  data.activity.unshift({ id: nextId('a'), type, title, meta });
  data.activity = data.activity.slice(0, 20);
}
