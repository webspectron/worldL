<p align="center">
  <img src="Public/brand/logo.png" alt="World Vexa Logistics" width="360">
</p>

<h1 align="center">World Vexa Logistics</h1>

<p align="center"><strong>Fast, Safe, Reliable</strong><br>
Website, live shipment tracking and operations console for <a href="https://worldvexalogistics.com">worldvexalogistics.com</a></p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A5%2022.5-339933?logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/vite-6-646CFF?logo=vite&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/express-5-000000?logo=express&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/sqlite-node%3Asqlite-003B57?logo=sqlite&logoColor=white">
</p>

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [API reference](#api-reference)
- [Tracking IDs and references](#tracking-ids-and-references)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Licence](#licence)

## Overview

One Node.js process serves everything: the public website, the tracking API, the admin console and the built
React app. Data lives in a single SQLite file.

| Host | Serves |
|---|---|
| `https://worldvexalogistics.com` | Public website and shipment tracking |
| `https://www.worldvexalogistics.com` | Same app (redirects to the apex) |
| `https://private.worldvexalogistics.com` | Admin operations console (same app, same API, same database) |

The admin console only opens on the `private.` subdomain in production, and on `localhost` (`#/admin`) during
development. It never opens on the public domain.

## Features

**Public website**
- Home, Services, About, Locations, Help, Contact and Legal pages
- Live shipment tracking with a journey map, timeline and progress, with personal data masked
- Quote requests and booking (Ship) flow, plus a public quote result page
- Contact form that lands in the admin inbox
- SEO: canonical URLs, Open Graph tags, `robots.txt` and `sitemap.xml` served by the app

**Admin console (WVL Operations Console)**
- Operations dashboard with stats
- Create, edit, trash, restore and permanently delete shipments
- Tracking events: add and edit timeline entries and update status
- Returns
- Quote requests: review, publish and convert to shipments
- Document centre: generate PDFs (invoices, labels and other shipment documents) with barcodes
- Messages inbox
- Company settings

**Security**
- Password-only admin login checked against a bcrypt hash held in an environment variable
- Server-side sessions (`httpOnly`, `sameSite=lax`, `secure` in production)
- `helmet` headers, and rate limiting on login and on every public write endpoint

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, plain CSS with design tokens (`src/styles/tokens.css`) |
| Routing | Hash routing in `src/App.tsx` (no router library) |
| Maps | Leaflet / react-leaflet, OpenStreetMap Nominatim (geocoding), OSRM (road routing) |
| Documents | jsPDF, html2canvas, JsBarcode |
| Icons | lucide-react |
| Backend | Express 5, express-session, helmet, express-rate-limit, bcryptjs |
| Database | SQLite through Node's built-in `node:sqlite` (WAL mode) |
| Tooling | tsx, concurrently, sharp (image pipeline), Node's built-in test runner |

## Getting started

### Prerequisites

- **Node.js 22.5 or newer.** The database uses the built-in `node:sqlite` module, which older versions don't have.
- npm (bundled with Node)

### Install and run

```bash
git clone https://github.com/ojrandy/WVL.git
cd WVL
npm install            # also builds the app (postinstall runs `npm run build`)
cp .env.example .env   # then fill in the two secrets, see Configuration
npm run dev            # Express API on :5000 + Vite on :3000
```

Open:
- Public site: <http://localhost:3000>
- Admin console: <http://localhost:3000/#/admin>

Vite proxies `/api` to the Express server, so both run from the one `npm run dev` command.

### Production build

```bash
npm run build          # tsc + vite build -> dist/, server tsc -> dist-server/
npm start              # node dist-server/server/index.js
```

## Configuration

Copy `.env.example` to `.env` (it is gitignored). Never commit real values.

| Variable | Required | Description |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | yes | bcrypt hash of the admin password (starts with `$2b$12$`, paste it unquoted) |
| `SESSION_SECRET` | yes | Random 64-character hex string used to sign session cookies |
| `PORT` | no | API port. Defaults to `5000`; hosting platforms usually set it for you |
| `NODE_ENV` | prod | Set to `production` on the live server (enables secure cookies) |
| `DB_PATH` | prod | Absolute path to the `.db` file, in storage that survives redeploys. Defaults to `data/app.db` |
| `SEED_DEMO_DATA` | no | Has no effect any more. Leave it `false` or unset |

**Generate the admin password hash** (PowerShell; the password is typed at a hidden prompt):

```powershell
$s = Read-Host "New admin password" -AsSecureString
$env:NEW_ADMIN_PW = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
node -e "console.log(require('bcryptjs').hashSync(process.env.NEW_ADMIN_PW, 12))"
Remove-Item Env:NEW_ADMIN_PW; Remove-Variable s
```

**Generate a session secret:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Changing the admin password is a configuration change: set a new hash and restart. No code change is needed.

Brand facts (company name, email, domain, admin subdomain, tracking prefix) live in one file,
[`src/config/brand.ts`](src/config/brand.ts). Import from it rather than hard-coding them.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs the Express API (watch mode) and Vite together |
| `npm run dev:vite` | Vite only |
| `npm run server` | Express API only, with `tsx watch` |
| `npm run build` | Type-checks and builds the frontend (`dist/`) and server (`dist-server/`) |
| `npm start` | Starts the production server |
| `npm run preview` | Previews the built frontend with Vite |
| `npm test` | Runs the unit tests in `scripts/*.test.ts` (tracking IDs, references, routing, time zones, intl) |

`scripts/optimize-images.mjs` builds the optimised images in `Public/` from the originals in `images/`.

## Project structure

```
├── src/
│   ├── App.tsx            Hash routing (KNOWN_PAGES) and admin host gating
│   ├── pages/             Public pages (Home, Track, TrackResult, Services, Quote, Ship, ...)
│   ├── components/        Header, Footer, maps, ShipmentTimeline, Barcode, ...
│   ├── admin/             Operations console (dashboard, shipments, events, documents, quotes, settings)
│   ├── services/          API client, geocoding, routing, planning and simulation engines
│   ├── shared/            Code shared with the server (tracking IDs, references, statuses, time zones, units)
│   ├── config/brand.ts    Single source of brand facts
│   ├── data/              Static site data (gateways, countries, help articles, legal documents)
│   └── styles/            Design tokens and global styles
├── server/
│   ├── index.ts           Express app: security headers, sessions, API, static files
│   ├── db.ts              SQLite schema and default settings
│   ├── routes/            auth, shipments, track, quotes, documents, messages, settings, stats
│   ├── middleware/        Admin auth and rate limiting
│   ├── progress.ts        Time-based shipment progress
│   ├── trackingIds.ts     Unique tracking-ID allocation
│   └── seo.ts             robots.txt and sitemap.xml
├── Public/                Static assets served at / (capital P, see below)
├── images/                Logo master and stock-photo originals (with SOURCES.md)
├── scripts/               Image pipeline and unit tests
└── docs/                  Project documentation
```

> **`Public/` has a capital P.** `vite.config.ts` sets `publicDir: 'Public'`, and Linux hosts are case-sensitive.
> Don't rename it.

## Architecture

```
Browser ──► Express (server/index.ts)
              ├── /api/*            JSON API ──► SQLite (node:sqlite, WAL)
              ├── /robots.txt, /sitemap.xml
              └── /*                built SPA from dist/
```

- **Development:** Vite serves the frontend on `:3000` and proxies `/api` to Express on `:5000`.
- **Production:** a single Express process serves the API and the built SPA on `PORT`.
- **Routing:** the SPA uses hash URLs (`#/services`, `#/track/WVL7K2M9`, `#/quote/:id`).
- **Admin gating:** `isAdminHost()` in `src/App.tsx` opens the console when the hostname matches `ADMIN_HOST`
  (`private.worldvexalogistics.com`), or on localhost with `#/admin`.
- **Shared code:** `src/shared/*` and some of `src/services/*` are compiled into the server as well, so they must
  stay free of DOM APIs.
- **Database:** the schema is created on start-up in `server/db.ts`. A new deployment starts with an empty database.

## API reference

All endpoints are under `/api`. **Admin** means an authenticated admin session is required.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | public | Health check |
| `POST` | `/auth/login` | public (rate-limited) | Admin login |
| `POST` | `/auth/logout` | public | End the current session |
| `GET` | `/auth/session` | public | Current session state |
| `GET` | `/track/:trackingNumber` | public | Public tracking lookup (personal data masked) |
| `GET` | `/shipments` | admin | List shipments |
| `POST` | `/shipments` | public (rate-limited) | Create a shipment (booking flow and admin) |
| `GET` `PUT` `DELETE` | `/shipments/:trackingNumber` | admin | Read, update, move to trash |
| `PATCH` | `/shipments/:trackingNumber/status` | admin | Update status |
| `POST` `PATCH` | `/shipments/:trackingNumber/events[/:eventId]` | admin | Add or edit tracking events |
| `POST` | `/shipments/:trackingNumber/return` | admin | Create a return |
| `POST` | `/shipments/:trackingNumber/restore` | admin | Restore from trash |
| `DELETE` | `/shipments/:trackingNumber/permanent` | admin | Permanently delete |
| `GET` | `/quotes` | admin | List quote requests |
| `POST` | `/quotes` | public (rate-limited) | Submit a quote request |
| `GET` | `/quotes/:id` | public | Read one quote (internal notes stripped) |
| `PUT` `PATCH` | `/quotes/:id/publish` | admin | Publish a quote |
| `PATCH` | `/quotes/:id/status` | mixed | Customers may only accept or decline; other statuses need admin |
| `POST` | `/quotes/:id/convert` | admin | Convert a quote to a shipment |
| `GET` | `/documents`, `/documents/:id` | admin | List / read documents |
| `POST` | `/documents/generate` | public (rate-limited) | Generate a document |
| `POST` | `/documents/:id/regenerate` | admin | Regenerate a document |
| `PATCH` | `/documents/:id/status`, `/documents/:id/payment-status` | admin | Update document status |
| `DELETE` | `/documents/:id` | admin | Delete a document |
| `POST` | `/messages` | public (rate-limited) | Contact form |
| `GET` `PATCH` | `/messages`, `/messages/:id/status` | admin | Inbox |
| `GET` | `/settings` | public | Company settings |
| `PUT` | `/settings` | admin | Update settings |
| `GET` | `/stats` | admin | Dashboard statistics |
| `GET` | `/diag/storage` | admin | Database storage check (used after deploys) |

Access rules are enforced in `server/routes/*` and `server/middleware/auth.ts`; treat those files as the
authoritative source.

## Tracking IDs and references

| Kind | Format | Example |
|---|---|---|
| Tracking ID | `WVL` + 5 characters, exactly 8 in total | `WVL7K2M9` |
| Piece label | Tracking ID + 2-digit piece number | `WVL7K2M9-01` |
| Seal | `WVL-SL-######` | `WVL-SL-000123` |
| Ticket | `WVL-TKT-######` | `WVL-TKT-000123` |
| Invoice | `WVL-INV-######` | `WVL-INV-000123` |

Tracking IDs use the alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (no `0/O` or `1/I`, so IDs can't be misread).
They are generated by one shared function, [`src/shared/trackingId.ts`](src/shared/trackingId.ts), and only the
server allocates real IDs ([`server/trackingIds.ts`](server/trackingIds.ts)), checking uniqueness. Lookups accept
lower case, spaces and pasted dashes.

## Deployment

The site deploys from GitHub to Hostinger as a Node.js web app. Short version:

1. Node **22.x** (never below 22.5); install command `npm install`; start command `npm start`.
2. Set `NODE_ENV=production`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` and `DB_PATH` in the host panel.
3. Point `DB_PATH` at a folder **outside** the deploy directory so the database survives redeploys.
4. Attach `worldvexalogistics.com`, `www.` and `private.` to the **same** app.
5. Install SSL on all three hostnames and force HTTPS. Admin login needs HTTPS in production.

The full checklist, smoke test and backup procedure are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Documentation

| Document | Contents |
|---|---|
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Hosting, environment, domains, SSL, smoke test, backups |
| [`docs/BRAND_GUIDE.md`](docs/BRAND_GUIDE.md) | Colours, fonts, logo usage, naming, tracking-ID format |
| [`docs/CONTENT.md`](docs/CONTENT.md) | All public copy and placeholders |
| [`docs/MOTION_3D_SPEC.md`](docs/MOTION_3D_SPEC.md) | Motion and 3D spec, performance budget |
| [`docs/REBRAND_MAP.md`](docs/REBRAND_MAP.md) | Brand migration checklist |
| [`docs/PROJECT_TRACKER.md`](docs/PROJECT_TRACKER.md) | Task tracker, change log, open items |

## Contributing

- Work in small commits with a prefix: `fix: …`, `docs: …`, `assets: …`, `rebrand: …`.
- `npm run build` must pass with **zero** TypeScript errors, and `npm test` must pass.
- Check pages at 375px, 768px and 1440px.
- Don't rename database tables or columns, or the internal `sdl-*` CSS classes and `--sdl-*` tokens.
- Never commit `.env`, the `data/` folder or any `.db` file.
- Public copy comes from `docs/CONTENT.md`. Don't publish invented facts (phone numbers, addresses, statistics,
  testimonials).
- Images: WebP/AVIF with a JPG fallback, explicit `width`/`height`, meaningful `alt` text, and `loading="lazy"`
  below the fold.

## Licence

Private, proprietary code. All rights reserved by World Vexa Logistics. No licence is granted to use, copy or
distribute it. Stock photos are used under their own free licences (Pexels, Unsplash, Pixabay); sources are listed
in `images/*/SOURCES.md`.

---

<p align="center">© World Vexa Logistics · <a href="mailto:info@worldvexalogistics.com">info@worldvexalogistics.com</a></p>
