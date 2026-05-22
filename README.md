# SimpleCRM

A small CRM app: leads, opportunities, pipeline stages, custom fields.

## Requirements

- Node.js 20+
- npm 10+

## Install

```sh
npm install
```

## Run

```sh
npm run dev
```

That single command starts both processes:

- **API server** on http://localhost:3000 (Express + TypeORM + SQLite, via `nodemon` + `ts-node`)
- **Web client** on http://localhost:5173 (React + Vite, proxies `/api/*` to the server)

Open http://localhost:5173 in your browser.

## Other scripts

| From the repo root | What it does |
| --- | --- |
| `npm run build` | Builds both packages |
| `npm run typecheck` | Type-checks both packages |
| `npm run lint` | Lints the client |
| `npm run test:e2e` | End-to-end tests (Playwright) |

## End-to-end tests

Tests run in a **headless** browser by default. To watch them:

| Command | What it does |
| --- | --- |
| `npm run test:e2e` | Headless (CI-friendly) |
| `npm run test:e2e:headed` | Visible Chromium window |
| `npm run test:e2e:watch` | Visible browser, slowed (400ms between actions via `chromium-watch` project) |
| `npm run test:e2e:ui` | Playwright UI — pick tests, step through, watch replay |

Chromium is installed automatically before the default `test:e2e` run (`pretest`). For headed/UI modes, run once if needed: `npm run install:browsers -w @simple-crm/e2e`.

```sh
npm run test:e2e:headed
```

E2E runs use ports **3001** (API) and **5174** (client) so they do not conflict with `npm run dev`, a separate SQLite file (`code/e2e/.test-db.sqlite`), and a minimal seed (settings, custom fields, and stages only—no sample leads).

Coverage includes adding/editing leads, viewing/adding/editing opportunities on a lead, and forecast by expected close date with custom-field grouping (`code/e2e/tests/`).

## Layout

```
code/
  client/   React + Vite frontend
  server/   Express + TypeORM API
  e2e/      Playwright end-to-end tests
```
