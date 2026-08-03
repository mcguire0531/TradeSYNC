# TradeSYNC

TradeSYNC is a working, responsive construction-coordination prototype built from the supplied screen designs. It combines building locations, room readiness, independent trade and Turner verification, tasks, trade handoffs, building-wide inspection gates, actual status clashes, constraints, documentation, and fast mobile field updates in one installable web app.

## Open the app

No software installation or build step is required.

### Easiest option

Open `index.html` in a modern browser.

### Recommended local option

Running a small local web server enables the installable and offline features:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173` in the browser.

## Core workflow improvements

### 1. Independent Trade and Turner verification

- Trade View and Turner View use the same task list but keep separate status records.
- Every status change records the view, prior status, new status, user, source, and time.
- A clash exists only when the actual saved Trade and Turner statuses disagree.
- Clashes can be corrected by applying the verified Trade or Turner status to both records.
- The Tasks screen shows a verification summary and the latest verification activity for each task.

### 2. Room-readiness engine

Each room or exterior work area receives a live readiness status and readiness score calculated from:

- Turner-confirmed trade completion
- Trade/Turner verification clashes
- Active constraints and their actual affected scope
- Required inspection gates
- Requested or rejected trade handoffs
- Overdue actions

Readiness states are:

- Not Started
- In Progress
- At Risk
- Ready for Inspection
- Ready for Next Trade
- Blocked
- Turnover Ready

The room overview shows the reason for the status and the next best action. Home and building cards summarize ready, blocked, and at-risk locations.

### 3. Trade-to-trade handoffs

- A completed trade can request a handoff to the next trade.
- The request includes an acceptance date, note, and optional photos.
- The receiving trade can accept the handoff or return it for correction.
- A rejected handoff blocks readiness until the condition is corrected and resubmitted.
- Handoff history remains attached to the room for documentation.

### 4. Constraints show actual impact

Constraints remain building-level records, but capture the work they affect:

- Actual impact type
- Entire building, Interior/Exterior section, wing/location, or specific room/work area
- Affected trades
- Estimated delay days
- Stage affected: handoff, inspection, turnover, or all readiness stages
- Whether the constraint blocks readiness

Resolving a constraint requires confirmation and a resolution note. Optional proof images can be attached. Once confirmed, the constraint moves to the Turner-blue Resolved section and readiness recalculates.

#### Priority-based Resolve By dates

Constraint deadlines now follow a simple priority policy:

- **Critical Path:** target resolution within 2 calendar days
- **Moderate:** target resolution within 7 calendar days
- **Low:** target resolution within 14 calendar days

Changing the priority while creating a constraint automatically updates the Resolve By date. A user may choose an earlier date, but the app prevents a later date than the priority target. Existing active constraints are also limited to the maximum date allowed by their priority. Overdue and urgent dates are visually identified on the Constraints page.

### 5. Inspections operate as readiness gates

- Inspections remain building-wide and are never assigned to an individual room.
- An inspection can be marked as a required readiness gate.
- Gates are assigned to Structure/Shell, MEP Rough-In, Close-In, Finishes, or Turnover.
- Failed or pending required gates can block room readiness.
- The Inspections page includes a readiness-gate dashboard showing passed, failed, and pending gates.

### 6. Effortless field participation for trade partners and Turner

Quick Update provides one mobile workflow for both sides:

1. Choose Trade Partner or Turner.
2. Confirm building and room/work area.
3. Choose a trade and task or the entire trade scope.
4. Tap Complete, In Progress, or Not Started.
5. Add a note, photo, pasted screenshot, or dictated text.
6. Submit.

Additional fast-entry support includes:

- Project and room quick codes
- QR-ready room links with camera scanning on supported browsers
- A Turner Action Center that opens the next verification, failed gate, or handoff action
- One-tap access from Home, Tasks, and Room Readiness
- Existing offline browser storage and installable PWA behavior

### 9. Screen improvements

- **Home:** portfolio readiness, Turner Action Center, Quick Update, readiness summaries, and room-based building progress.
- **Rooms:** Interior/Exterior stays simple, with a section readiness summary above the existing filters.
- **Room Overview:** readiness score, blockers, next action, verification, handoffs, and room-to-building progress roll-up.
- **Tasks:** independent verification summary, actual clashes, audit history, Quick Update, handoffs, and direct progress correlation with the building.
- **Inspections:** building selector plus a required-gate dashboard.
- **Constraints:** impact badges, affected scope, delay, readiness effect, confirmed resolution, and priority-controlled Resolve By dates.
- **Comments:** drafts, image previews, pasted screenshots, and permanent submitted documentation.

## Direct room-to-building progress roll-up

Room construction progress is based on the percentage of trades Turner has confirmed complete for that room or exterior work area.

Building progress is calculated as the **equal average of every room and exterior work area in that building**:

```text
Building Progress = Sum of Room Progress Percentages / Number of Rooms and Work Areas
```

This same value is used consistently:

- The Home building card shows the building's room-progress average.
- The Room Overview shows the selected room beside the building roll-up.
- The Tasks page shows the selected room's official progress and the resulting building progress.
- Any Turner task-status change, corrected clash, Quick Update, added room, or removed building immediately recalculates the roll-up.

Readiness remains a separate measurement. A building can have high construction progress while rooms remain Blocked or At Risk because of failed gates, constraints, rejected handoffs, or verification clashes.

## Existing app behavior retained

- Mobile-first Home, Rooms, Tasks, Inspections, Constraints, and More screens
- Tapping a building asks the user to choose Interior or Exterior
- Interior and Exterior maintain separate locations and room lists
- Add approved buildings by access code; demo code `1234` adds **Cosner Tech - CAB**
- Add locations, rooms, exterior work areas, photos, plans, and elevations
- Remove a building and its locally stored rooms, tasks, inspections, constraints, handoffs, and quick-update records
- Building and room dropdowns on Tasks
- Individual task status controls for every trade
- Building-wide inspections and constraints
- Turner-blue Resolved constraints section
- Permanent comments and image documentation
- Comment drafts, image uploads, screenshot paste, and drag-and-drop
- Export submitted project data as JSON
- Reset demonstration data

## Clash behavior

Clashes are calculated from actual saved task status fields. Trade View and Turner View share the same task but keep separate status records. A clash exists only while those statuses differ. Correcting a clash applies the selected verified status to both records, removes the mismatch, recalculates room and building progress, recalculates readiness, and adds permanent documentation.

Turner View remains the official room-progress record shown outside the Tasks page.

## Documentation behavior

Submitted comments, images, verification history, handoff history, constraint resolution notes, and inspection results are preserved. Completing work, passing an inspection, correcting a clash, accepting a handoff, or resolving a constraint does not delete prior documentation.

Draft comments remain private in the current browser until submitted.

## Prototype storage

Changes, drafts, and compressed image attachments are saved in the browser on the device being used. They are not yet shared between devices or users. A production version would normally add:

- Company sign-in and role-based permissions
- A shared cloud database
- Secure cloud photo, drawing, audio, and attachment storage
- Server-managed building and QR access codes
- Real-time updates and push notifications
- Audit reporting and integrations with existing project-management systems

## Project files

- `index.html` — app entry point
- `css/` — responsive TradeSYNC interface styles
- `js/` — screens, data, readiness rules, priority deadlines, progress roll-up, navigation, and interactions
- `manifest.webmanifest` — installable web-app information
- `sw.js` — offline application-shell cache
- `assets/` — TradeSYNC icon and supplied building imagery
