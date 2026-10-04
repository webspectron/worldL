# CLAUDE.md — World Vexa Logistics Website

> This file is read automatically by Claude Code at the start of every session.
> Keep it short, current and true. Detailed specs live in `/docs`.

## 0. Your role: read this first

**The system is already built, and it works.** It is a complete, running logistics platform: public website,
live shipment tracking, Express/SQLite API, admin operations console, PDF documents, quotes and bookings. It was
last branded "SDL Global Logistics".

**You are a senior full-stack developer re-launching it as a new company, World Vexa Logistics, on a new domain.**
Work in place on the existing code (no rewrites), in small reviewable commits (`rebrand: …`, `assets: …`, `fix: …`),
and explain what changed, which files, and how you verified it. Tracking, admin login, shipment creation, documents,
quotes and the database must keep working after every change. The step-by-step plan is in `PROMPTS.md`.

## 1. What this job is (and isn't)

**We change only:** the company name, logo, domain, contact email, admin password, tracking/reference prefixes, and
the photos that show the old brand (replaced with free HD stock).

**We do NOT change:** design, layout, colours, fonts, copy structure, 3D/motion, features or the database schema.
If a change would alter how a page looks (other than the logo and the branded photos), stop and ask.

Decisions already made (don't revisit):
- **Internal names stay:** CSS classes (`sdl-*`), CSS tokens (`--sdl-*`), TypeScript identifiers and DB table/column
  names. Visitors never see them, and renaming them is where design breakage would come from.
- The new site starts with a **fresh, empty database** on Hostinger. Nothing is migrated.
- Admin login stays **password-only** (bcrypt hash in an env var). A new password is an env value, not a code change.
- Everything a visitor, admin user, search engine or PDF can see must carry **zero** trace of the old brand or domain.

## 2. Company facts (single source of truth)

| Field | Value |
|---|---|
| Company name (UI) | World Vexa Logistics |
| Short name | WVL (e.g. "WVL Operations Console", "WVL Operations Centre") |
| Registered legal name | World Vexa Logistics (no "Ltd"; used in the footer, legal pages and PDFs) |
| Tagline | Fast, Safe, Reliable |
| Primary email | info@worldvexalogistics.com |
| Domain | worldvexalogistics.com (public site: https://worldvexalogistics.com + `www`) |
| Coverage | Worldwide |
| Admin console URL | https://private.worldvexalogistics.com only (subdomain `private`, same Node app), plus `#/admin` on localhost |
| Tracking ID prefix | `WVL`: full ID is **exactly 8 characters**, `WVL` + 5 characters (e.g. `WVL7K2M9`) |
| Reference prefix | `WVL`: `WVL-SL-######` (seal), `WVL-TKT-######` (ticket), `WVL-INV-######` (invoice) |
| Logo source | `images/World Vexa Logistics Logo.png` (2024×777, red/black). Has a fake checkerboard "transparency" painted in; clean it first, or use a real transparent PNG/SVG from the designer |
| Photos | Replace every photo showing the old brand with free HD stock (Pexels / Unsplash / Pixabay licences) |
| Phone / WhatsApp / HQ address / socials | **Blank. Stay hidden until the owner supplies them. Never invent them.** |

If a fact is not in this table or in `docs/BRAND_GUIDE.md`, **ask** rather than invent it.

## 3. Tech stack (already in place; don't swap frameworks)

- **Frontend:** React 18 + TypeScript + Vite 6. Single-page app with **hash routing** handled in `src/App.tsx`
  (`KNOWN_PAGES`). No React Router.
- **Styling:** Plain CSS per component/page + design tokens in `src/styles/tokens.css` and `src/styles/global.css`.
- **Maps:** Leaflet / react-leaflet. Geocoding via OpenStreetMap Nominatim, road routing via OSRM (public endpoints).
- **Icons:** lucide-react. **Barcodes:** jsbarcode. **PDFs:** jspdf + html2canvas.
- **Backend:** Express 5 (`server/`), SQLite via Node's built-in `node:sqlite` (**requires Node ≥ 22.5**),
  express-session auth, helmet, rate limiting.
- **Admin:** served ONLY on **`private.worldvexalogistics.com`** in production (`isAdminHost()` in `App.tsx` matches
  `ADMIN_HOST` from `src/config/brand.ts`). On the public domain, admin must never open. `#/admin` works on localhost only.
- **Static assets folder is `Public/` (capital P)** — `vite.config.ts` sets `publicDir: 'Public'`. Do not rename it;
  Hostinger's Linux build is case-sensitive.

## 4. Commands

```bash
npm install            # also runs `npm run build` via postinstall
npm run dev            # Express API (:5000) + Vite (:3000) together
npm run build          # tsc + vite build + server tsc -> dist/ and dist-server/
npm start              # production: node dist-server/server/index.js
```

Local admin: `http://localhost:3000/#/admin`. Env vars: see `.env.example` and `docs/DEPLOYMENT.md`.

## 5. Key folders

```
src/pages/        Public pages (Home, Track, TrackResult, Services, Quote, Ship, About, Contact, Help, Legal, Locations, PublicQuoteResult)
src/components/   Header, Footer, maps (HomeNetworkMap, FacilityNetworkMap, JourneyMap), Barcode, etc.
src/admin/        Admin console (dashboard, create shipment, tracking events, documents, quotes, settings)
src/services/     api.ts, geocodingService.ts, routingEngine.ts, planningEngine.ts, simulationEngine.ts
src/data/         Static site data (gateways, countries, help articles, legal docs, image map)
src/styles/       tokens.css (design tokens), global.css
server/           Express app, routes, db.ts (schema + default settings)
Public/           logo, favicon, images (served at /)
docs/             Project docs — read the relevant one before each phase
```

## 6. Rules for every task

1. **Read `docs/PROJECT_TRACKER.md` first.** Work on the next unchecked task in the current phase unless told otherwise.
2. **One task → one small, reviewable change.** Don't mix rebrand, copy and 3D work in one commit.
3. **Copy comes from `docs/CONTENT.md`.** Don't write marketing text on the fly. If copy is missing, add it to
   CONTENT.md first, then use it.
4. **Brand values come from `docs/BRAND_GUIDE.md`** (colours, fonts, naming, tracking-ID format).
5. **Use `docs/REBRAND_MAP.md`** as the checklist for old-brand removal. Tick items as you go.
6. **Never break existing behaviour:** tracking lookup, admin login, shipment creation, documents/PDFs, quote flow,
   database persistence. After any change, run `npm run build` — it must pass with **zero TypeScript errors**.
7. **No fabricated facts on the public site:** no invented statistics, testimonials, client logos, certifications,
   awards, phone numbers or addresses. Use the placeholders defined in CONTENT.md and flag them in the tracker.
8. **Performance budget is a requirement, not a wish** (see MOTION_3D_SPEC.md §2). Anything 3D is lazy-loaded
   and has a static fallback and a `prefers-reduced-motion` path.
9. **Don't touch** `.env`, the live database file, or `server/middleware/auth.ts` security logic unless the task
   is explicitly about them.
10. **No demo data.** The demo shipments, quotes and documents were removed for launch (tracker 6.7). Don't add sample shipments or fake records back to the code or the production database.
11. **Don't rename the database tables or columns.** The DB *file* gets a neutral name once (PROMPTS.md Prompt 2);
    the new host starts with a fresh database.
12. After finishing a task: tick it in `PROJECT_TRACKER.md`, add a one-line entry to its **Change log**, and
    list anything that needs the owner's input under **Blocked / Needs owner**.

## 7. Conventions

- CSS variables use the `--sdl-*` prefix and classes the `sdl-` prefix. These are internal names and **stay as they are**.
- Brand strings live in **one place**: `src/config/brand.ts` (name, legal name, emails, domain, social links,
  tracking prefix). Import from it; no hard-coded brand strings in components.
- Tracking IDs are generated by **one shared function** (see BRAND_GUIDE.md §7) used by both server and client.
- Keep comments factual and brand-neutral (no old company names in comments either).
- Images: WebP/AVIF with JPG fallback, explicit `width`/`height`, `loading="lazy"` below the fold.
- Accessibility: every image has meaningful `alt`; contrast ≥ 4.5:1 for body text; all interactive 3D is decorative
  or has a keyboard/text equivalent.

## 8. Definition of done (per task)

- [ ] `npm run build` passes, no new console errors in the browser.
- [ ] Checked at 375px (mobile), 768px (tablet) and 1440px (desktop).
- [ ] No old-brand strings introduced (`grep -rniE "duolingo|sdl global|sdlgloballogistics|sdl-logo|images/sdl/" src server index.html Public`
  shows nothing new; internal `sdl-*` CSS classes/tokens are allowed).
- [ ] Tracker updated.