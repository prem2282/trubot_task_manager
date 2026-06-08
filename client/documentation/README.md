# Client Code Documentation

Plain-English reference for every component, store method, service function, and type in `client/src/`.

## How to read this documentation

Each file below maps to a part of the React frontend. For every **function**, **component**, or **store method**, you will find:

- **What it does** — purpose in plain English
- **When it is used** — which page or flow triggers it
- **Parameters / props** — what it accepts
- **Returns / renders** — what it produces
- **Dependencies** — API calls, other stores, socket connections

## Document index

| File | Covers |
|------|--------|
| [01-types-and-services.md](./01-types-and-services.md) | Shared types, Axios API client, Socket.io client, task helpers |
| [02-stores.md](./02-stores.md) | Zustand auth, task, and toast state |
| [03-components.md](./03-components.md) | Layout, switchers, info tips, toast, task modal |
| [04-pages.md](./04-pages.md) | Login, register, dashboard, workspaces, team |
| [05-app-and-routing.md](./05-app-and-routing.md) | App shell, routes, bootstrap |

## UI flow (high level)

```
main.tsx → App.tsx (Router)
  → Public: Login, Register, AcceptInvite
  → Protected (AppLayout): Dashboard, Workspaces, Team
       → TopNav: AccountSwitcher, WorkspaceSwitcher
       → Pages call stores → stores call api.ts → backend
       → Dashboard listens to socket.ts for live task updates
       → Toast store for transient success messages
```
