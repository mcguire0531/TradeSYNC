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
- Trade View and Turner View for the selected room
- Mark a trade complete or reopen it
- A completed trade is always shown at 100 percent
- Add tasks and update task status
- Room progress recalculates from trade completion
- Inspection dashboard with trade-level pass, fail, and not-inspected totals
- Add inspections, change results, and record failure comments
- Active and resolved constraints
- Critical Path, Moderate, and Low priority filters
- Add, resolve, and reopen constraints
- Messages and notifications panels
- Export all prototype data as JSON
- Reset the app to its original demonstration data
- Browser local-storage persistence
- Responsive layouts for phones, tablets, and desktop browsers
- Web-app manifest and offline application shell

## How the prototype stores information

Changes are saved in the browser on the device being used. They are not yet shared between different users or devices. The **More** page can export the current data or reset the prototype.

A production version would normally add:

- Company sign-in and role-based permissions
- A shared cloud database
- Photo, drawing, and attachment storage
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
