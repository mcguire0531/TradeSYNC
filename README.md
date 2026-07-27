# TradeSYNC

TradeSYNC is a responsive construction coordination prototype based on the supplied mobile and tablet screen designs. It brings room readiness, trade completion, tasks, inspections, clashes, and constraints into one app.

## What works in this version

- Home dashboard with building cards and project progress
- Room list with status filtering and room detail navigation
- Trade View and Turner View for each room
- Trade partners can mark their scope complete or reopen it
- Room progress recalculates when trade status changes
- Tasks can be added and their status can be updated
- Inspection summary and trade-level inspection records
- Inspections can be added and marked Passed, Failed, or Not Inspected
- Failed inspections can include a correction comment
- Constraints can be added, filtered by priority, resolved, and reopened
- Demo changes are saved in the browser with local storage
- Responsive layout designed for phones, tablets, and desktop browsers
- Installable web-app manifest

## Run the app locally

1. Install Node.js 18 or newer.
2. Open a terminal in this project folder.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local address shown in the terminal.

## Production build

Run:

```bash
npm run build
```

The finished static app will be created in the `dist` folder.

## Important prototype note

This first version uses sample data and saves updates only in the current browser. A production version should connect to company authentication, a shared database, file storage, push notifications, and role-based permissions.
