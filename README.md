# TradeSYNC

TradeSYNC is a working, responsive construction-coordination prototype built from the supplied screen designs. It combines room readiness, trade completion, tasks, inspections, clashes, and constraints in one installable web app.

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
- Add a new building
- Search, filter, and paginate 72 demo rooms
- Open any room to review overall progress, trade progress, clashes, and recent activity
- Building and room dropdown selection at the top of the Tasks page
- Matching Trade View and Turner View layouts with independent completion records
- Shared tasks automatically appear in both Trade View and Turner View
- Trade/Turner status disagreements automatically create task clashes
- Open a clash record to compare both interface statuses
- Open any trade to review its tasks and add a task directly to that trade
- Mark a trade complete or reopen it independently in either interface
- A trade marked complete in an interface is always shown at 100 percent in that interface
- Add tasks, include an initial comment, and update task status
- Open any task to review its permanent comment thread and add more comments
- Add optional images to task comments and initial task documentation
- Inspection comments remain in the record after an inspection passes
- Add optional images to inspection comments
- Active and resolved constraints
- Click a constraint to open its description, images, comments, owner, and resolve-by date
- Add optional images while creating a constraint or adding a constraint comment
- Constraints use Schedule, Resource, Coordination, Design, Material, or Access types; Clash is tracked separately
- Critical Path, Moderate, and Low priority filters
- Add, resolve, and reopen constraints without deleting their documentation
- Messages and notifications panels
- Export all prototype data as JSON
- Reset the app to its original demonstration data
- Browser local-storage persistence
- Responsive layouts for phones, tablets, and desktop browsers
- Web-app manifest and offline application shell

## Documentation behavior

Comments and image attachments are append-only documentation in the prototype. Passing an inspection, completing a task, completing a trade, or resolving a constraint does not remove its prior comments or images.

Trade View and Turner View share the same task records but keep separate status fields. When the two statuses disagree, TradeSYNC shows a clash until the records match again. Turner View confirmation is used for the room progress shown outside the Tasks page.

## How the prototype stores information

Changes and compressed image attachments are saved in the browser on the device being used. They are not yet shared between different users or devices. The **More** page can export the current data or reset the prototype.

A production version would normally add:

- Company sign-in and role-based permissions
- A shared cloud database
- Secure cloud photo, drawing, and attachment storage
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
