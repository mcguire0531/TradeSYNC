# TradeSYNC

TradeSYNC is a working, responsive construction-coordination prototype built from the supplied screen designs. It combines building locations, room readiness, trade completion, tasks, inspections, real status clashes, and constraints in one installable web app.

## Open the app

No software installation or build step is required.

### Easiest option

Open `index.html` in a modern browser.

### Recommended local option

Running a small local web server enables the installable/offline features:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173` in the browser.

## Working features

- Home dashboard with the supplied building imagery and project progress cards
- Add an approved building by access code instead of manually entering project information
- Demo access code `1234` adds **Cosner Tech - CAB** with its building name, address, date, and starting information
- Separate Interior and Exterior location tabs for every building
- Interior and exterior locations maintain separate room lists unless the same location is deliberately added to both sections
- Add locations and upload photos, plans, elevations, and other visual documentation
- Add a room or work area to a specific interior or exterior location
- Remove a building from My Buildings, including its locally stored rooms and task workspaces
- Search, paginate, and filter rooms by location, floor, and status
- Open any room to review overall progress, trade progress, actual clashes, and recent activity
- The room overview **Open Trade View** button always opens Trade View
- Building and room dropdown selection at the top of the Tasks page
- Matching Trade View and Turner View layouts with independent completion records
- Shared tasks automatically appear in both Trade View and Turner View
- Trade/Turner status disagreements automatically create real task clashes from the saved status records
- Open a clash record, compare both statuses, and correct it by applying either verified status to both interfaces
- Open any trade to review its tasks, change each individual task status, and add a task directly to that trade
- Mark a trade complete or reopen it independently in either interface
- A trade marked complete in an interface is always shown at 100 percent in that interface
- Add tasks, include an initial comment, and update task status
- Open any task to review its permanent comment thread and add more comments
- Add optional images to task comments and initial task documentation
- Inspection comments remain in the record after an inspection passes
- Add optional images to inspection comments
- Constraint page grouped visually by Critical Path, Moderate, and Low priority
- Active constraints remain in their priority section
- Selecting Resolve moves the constraint into a dedicated Turner-blue Resolved section
- Reopening a resolved constraint moves it back to its active priority section
- Click a constraint to open its description, images, comments, owner, and resolve-by date
- Add optional images while creating a constraint or adding a constraint comment
- Constraints use Schedule, Resource, Coordination, Design, Material, or Access types; Clash is tracked separately
- Add, resolve, and reopen constraints without deleting their documentation
- Messages and notifications panels
- Export all prototype data as JSON
- Reset the app to its original demonstration data
- Browser local-storage persistence
- Responsive layouts for phones, tablets, and desktop browsers
- Web-app manifest and offline application shell

## Clash behavior

Clashes are calculated from the actual saved task status fields. Trade View and Turner View share the same task but keep separate status records. A clash exists only while those statuses differ. Correcting a clash applies the selected verified status to both records, removes the mismatch, recalculates the room, and adds an automatic documentation comment explaining the correction.

Turner View confirmation is used for room progress shown outside the Tasks page.

## Building location behavior

Each building maintains distinct Interior and Exterior locations. A room is assigned to one specific location and appears only in that section. The room list can then be filtered by location, floor, and status. Locations with the same name are treated as separate records only when a user deliberately creates them in both sections.

## Documentation behavior

Comments and image attachments are append-only documentation in the prototype. Passing an inspection, completing a task, completing a trade, resolving a clash, or resolving a constraint does not remove prior comments or images.

## How the prototype stores information

Changes and compressed image attachments are saved in the browser on the device being used. They are not yet shared between different users or devices. The **More** page can export the current data or reset the prototype.

A production version would normally add:

- Company sign-in and role-based permissions
- A shared cloud database
- Secure cloud photo, drawing, and attachment storage
- Server-managed building access codes
- Real-time updates and push notifications
- Audit history and reporting
- Integrations with existing project-management systems

## Project files

- `index.html` — app entry point
- `css/` — responsive TradeSYNC interface styles
- `js/` — screens, sample data, navigation, and interactions
- `manifest.webmanifest` — installable web-app information
- `sw.js` — offline application-shell cache
- `assets/` — TradeSYNC icon and building images extracted from the supplied design references
