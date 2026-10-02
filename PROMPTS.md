# Prompt Pack: Re-launch on a New Name & Domain

**The job:** take the finished, working SDL Global Logistics platform and re-launch it as a **new company on a new
Hostinger domain**. We change the **name, logo, domain, contact email and admin password**, and nothing else.

**What we do NOT change:** design, layout, colours, fonts, copy structure, 3D/motion, features, the database schema.
If a prompt would change how a page looks (apart from the logo and the photos that show the old brand), stop and ask.

**Estimated time:** about 1 hour of build work (the photo swap is the longest step), plus waiting for DNS/SSL on Hostinger.

**How to use this pack**
- The **Fact sheet** below is complete. Prompt 1 copies it into `CLAUDE.md`, and every later prompt reads it from there.
- Send **one prompt at a time**, in order. When a prompt says **STOP**, check the result in your browser
  (`npm run dev` → http://localhost:3000) before sending the next one.
- If something breaks, use **Prompt F (Fix)**. Starting a new chat? Send **Prompt R (Resume)** first.

---

## Fact sheet (complete: paste this into Prompt 1)

| Field | New value | Notes |
|---|---|---|
| Company name (UI) | `World Vexa Logistics` | |
| Short name | `WVL` | Used in the console title ("WVL Operations Console"), "WVL Operations Centre", etc. |
| Registered legal name | `World Vexa Logistics` | Shown in the footer, legal pages and PDFs (no "Ltd"). |
| Domain | `worldvexalogistics.com` | Public site: `https://worldvexalogistics.com` (+ `www`). |
| Primary email | `info@worldvexalogistics.com` | |
| Admin subdomain | `private` | Admin console: **`https://private.worldvexalogistics.com`** only (plus `#/admin` on localhost). |
| Tracking ID prefix | `WVL` | 3 letters + 5 characters = 8, e.g. `WVL7K2M9`. |
| Reference prefix | `WVL` | `WVL-SL-######` (seal), `WVL-TKT-######` (ticket), `WVL-INV-######` (invoice). |
| Tagline | `Fast, Safe, Reliable` | Same as before, and it's in the new logo. |
| New logo file | `images/World Vexa Logistics Logo.png` | 2024×777, red/black. **It has a fake checkerboard "transparency" painted in.** Prompt 3 removes it; a real transparent PNG/SVG from the designer would be better. |
| Photos | Replace every photo showing the old brand | Free HD/4K stock (Pexels / Unsplash / Pixabay licences). Prompt 4. |
| Phone / WhatsApp / address / socials | *(leave blank)* | Stay hidden until supplied. Never invented. |

**Decisions already made for this job (don't revisit):**
- Internal code names stay as they are: CSS classes (`sdl-*`), CSS tokens (`--sdl-*`), TypeScript identifiers, and
  the DB **table/column** names. Visitors never see them, and renaming them is where design breakage would come from.
- The new site starts with a **fresh, empty database** on Hostinger. Nothing is migrated from the old site.
- Admin login stays **password-only** (bcrypt hash in an env var). A new password is a new env value, not a code change.

---

## Prompt 1: Orientation, fact sheet & safety net (≈5 min)
```
You are a senior full-stack developer. This project is a finished, working logistics platform (public site, tracking, Express + SQLite API, admin console, PDFs, quotes). It is currently branded "SDL Global Logistics". We are re-launching it as a new company on a new domain. We change ONLY the name, logo, domain, email and admin password. Design, colours, layout, features and the DB schema stay exactly as they are.

Here is the fact sheet:
[PASTE THE FILLED-IN FACT SHEET TABLE HERE]

1. Read CLAUDE.md, PROMPTS.md, src/config/brand.ts, index.html, Public/site.webmanifest, server/index.ts, server/seo.ts and docs/DEPLOYMENT.md.
2. Update CLAUDE.md: replace the §2 "Company facts" table with the new facts, and replace §0–§1 with a short description of THIS job (re-launch under a new name/domain, no design changes, internal `sdl-*` names stay). Keep §3–§8 as they are, but fix any domain/brand values in them.
3. This folder is not a git repo. Run `git init`, check that .gitignore excludes node_modules/, dist/, dist-server/, data/, .env and *.local, and commit everything as "chore: baseline before re-launch".
4. Run `npm run build` and record whether it passes.
5. Produce a REPLACEMENT LIST: every place a visitor, admin user, search engine or PDF can see the old brand or domain (UI text, alt text, meta tags, JSON-LD, manifest, legal text, generated documents, emails/references, API health name, cookie name, logo/image file paths). Group it by file. Exclude CSS class names, CSS variables and TS identifiers.
Don't change any source file yet. STOP and report the build result and the replacement list.
```

## Prompt 2: Name, domain & email (≈10 min) 🧭
```
Apply the new facts from CLAUDE.md §2. Text and config only, with no visual changes.
1. src/config/brand.ts: COMPANY, COMPANY_SHORT, LEGAL_NAME, TAGLINE, EMAIL, DOMAIN, ADMIN_SUBDOMAIN, TRACKING_PREFIX. Leave PHONE/WHATSAPP/HQ_ADDRESS/SOCIAL empty.
2. Replace hard-coded brand text in components with brand.ts constants rather than a new hard-coded name: App.tsx page titles/descriptions, Home/Services/Ship/Track/About/Contact copy, image alt text, legalDocs.ts, DocumentBrand.tsx, server/index.ts (health name + start log). Use the replacement list from Prompt 1.
3. index.html (title, meta, OG/Twitter, canonical, JSON-LD) and Public/site.webmanifest: new name, domain and email.
4. Reference prefixes in src/shared/references.ts (seal/ticket/invoice + REFERENCE_PATTERN) and the matching placeholder in CreateShipmentView. If TRACKING_PREFIX changed, update the validation regex in src/shared/trackingId.ts so IDs stay exactly 8 characters, plus any placeholder/help text that shows an example ID. Run the tracking-ID tests.
5. package.json "name" → kebab-case of the new name (then `npm install` to refresh the lockfile). DB file name in server/db.ts and .env.example → a neutral name (e.g. `app.db`); the DB is fresh on the new host. Session cookie name in server/middleware/auth.ts → a neutral name (e.g. `admin.sid`); only that constant, no other auth logic.
6. Update docs/CONTENT.md and docs/BRAND_GUIDE.md name/domain/email references so the docs match the site.
Do NOT touch CSS, colours, layout, images or `sdl-*` class/token names. `npm run build` must pass with zero errors.
Then check locally: Home, Track, Contact, the admin login, create a shipment, and track it. Commit "rebrand: new name, domain and email". STOP and report what changed.
```

## Prompt 3: Logo & icons (≈10 min)
```
The new logo is at the path in CLAUDE.md §2. Open it and look at it first.
0. The file has NO real transparency: a grey/white checkerboard is painted into the background. Before anything else, make a clean transparent master (images/logo-master.png): remove the checkerboard and any white/light-grey background connected to the edges and the gaps between letters, keep the red and black artwork with smooth anti-aliased edges, and leave no grey fringe or leftover squares. Show me the result on a dark AND a light background before continuing. If it can't be made clean, STOP and tell me so I can ask the designer for a transparent PNG/SVG.
1. Generate, from the clean master, the same set we have today in Public/brand/ but with neutral names: logo.png (full colour), logo-white.png (for dark backgrounds: the black parts turn white and the red stays red; check that it reads well on the dark header/footer), mark.png (the "WV" + globe/box symbol only, for favicons and small spaces), favicon.png 512, favicon-32, favicon-16, apple-touch-icon 180, icon-192, icon-maskable-512 (all from mark.png, so it's readable at 16 px). Leave og-image.jpg for Prompt 4 (it's built from the hero photo). Do this inside scripts/optimize-images.mjs (it already builds the logo set with sharp) so it can be re-run.
2. Point brand.ts LOGO / LOGO_WHITE, index.html, site.webmanifest and the JSON-LD logo at the new files. Bump the ?v= cache-bust. Delete the old sdl-*.png files.
3. Check that the logo sits correctly (same height/space as the old one) in the header, mobile drawer, footer, admin sidebar, admin login, generated PDFs and the public quote print. If it needs a size tweak, change ONLY the logo's own size rules.
4. Rename the photo folder Public/images/sdl/ → Public/images/site/ and update the path in ResponsiveImage.tsx (and scripts/optimize-images.mjs), so URLs carry no old name.
Build, check at 375px and 1440px, commit "rebrand: new logo, icons and image paths". STOP and show me the logo in the header, footer and admin.
```

## Prompt 4: Replace branded photos with free HD photos (≈15 min) 🧭
```
Some site photos show the old brand painted on trucks, aircraft and containers. Replace every one of them with free, high-resolution stock photos. The layout and image slots stay exactly the same.
1. Open every source photo used by scripts/optimize-images.mjs (images/landingimage.png, images/landingimage-mobile.png, images/brand-img*.PNG, and anything else in its list) and list which slots (hero-home, hero-home-mobile, track-hero, callback-banner, services-hero, about-hero, track-result-vehicle, contact-team, industry-*, OG image, …) show the old brand or old logo. Also check images/free-pexels and images/free-cc0 for any visible branding.
2. For each affected slot, find a replacement on Pexels, Unsplash or Pixabay (their licences allow free commercial use without attribution). Rules:
   - Download the largest original available, ideally 4K (≥ 3840 px wide) and never below 2400 px for heroes.
   - Match the slot's subject and framing: e.g. a port/container ship/aircraft at sunset for the home hero, a portrait version for hero-home-mobile, a delivery truck for track-result-vehicle.
   - NO visible company logos, brand names or readable liveries on vehicles, containers or uniforms. No recognisable faces in close-up unless it's clearly stock-model photography.
   - Similar mood and warmth to the current photos, so the design doesn't change.
3. Save the originals in images/free-hd/ with the slot name, and log each one in images/free-hd/SOURCES.md (file, source page URL, photographer, licence, download date).
4. Point the affected entries in scripts/optimize-images.mjs at the new files (adjust crop/position if needed), regenerate og-image.jpg 1200×630 from the new home hero with the new logo, and run the script. The served widths stay at the current steps (max 2400 px). The 4K originals give sharp output but are never sent to browsers, which keeps the performance budget.
5. Update the alt text for every replaced photo so it describes the new picture (no company name painted on anything).
6. Delete the old branded originals from images/ and their old outputs from Public/images/site/.
Build, check Home, Services, About, Track, Track Result and Contact at 375px and 1440px. Commit "assets: replace branded photos with free HD stock". STOP and show me a before/after table (slot → old → new, with source link).
```

## Prompt 5: Admin password & secrets (≈5 min)
```
Set up the admin login for the new site. Don't change any auth logic.
1. Give me the exact commands (Windows PowerShell friendly) to generate a new ADMIN_PASSWORD_HASH from a password I choose, and a new SESSION_SECRET. Don't put my password in any file or commit.
2. Tell me how to put them in my local .env so I can test, and remind me they must be set again in Hostinger's environment variables (never committed).
3. Confirm .env.example has no real values and mentions the new DB file name.
4. After I've updated .env: restart `npm run dev`, confirm the old password is rejected and the new one works at http://localhost:3000/#/admin, and that logout works.
STOP and wait for me to confirm the login works.
```

## Prompt 6: Final sweep & QA (≈10 min)
```
Final check before deploying.
1. Run `npm run build`, then search the source AND the build output (dist/, dist-server/, index.html, Public/) for: the old company name, "SDL" as visible text, the old domain, the old email, "sdl-logo" and "images/sdl/". Ignore CSS class names, CSS variables and TS identifiers. List every remaining hit with file:line and fix any a visitor, admin, crawler or PDF can see.
2. Run `npm start` with NODE_ENV=production and check: all public pages load, tracking an ID, admin login, create shipment → track it publicly → change status, download each document type (each PDF shows only the new name/logo), submit a quote and a contact message (references use the new prefix), /robots.txt and /sitemap.xml show the new domain.
3. Update docs/PROJECT_TRACKER.md: add a short "Re-launch" section with what was done, plus "Blocked / Needs owner" (phone, address, socials, and a real transparent logo file if Prompt 3 had to clean the checkerboard).
Commit "chore: re-launch QA". STOP and give me a short go/no-go report.
```

## Prompt 7: Deploy to the new Hostinger site (≈15 min + DNS wait)
```
Prepare the deployment per docs/DEPLOYMENT.md, updated for the new domain. Don't deploy anything yourself. Give me the steps and update the doc.
1. Update docs/DEPLOYMENT.md for the new domain, admin subdomain and email.
2. GitHub: give me the commands to create and push to a NEW repo (fresh history, branch main).
3. Hostinger hPanel checklist: create the Node.js app, connect the GitHub repo, Node ≥ 22.5, install/build/start commands, environment variables (ADMIN_PASSWORD_HASH, SESSION_SECRET, NODE_ENV=production, DB_PATH on persistent storage, SEED_DEMO_DATA unset), attach the domain + www + <admin-subdomain>.<domain> to the SAME app, SSL for all three, force HTTPS, and set up the email mailbox.
4. Post-deploy smoke test: the site loads on https://<domain> and www; the admin opens ONLY on the admin subdomain (and #/admin on the public domain falls back to Home); login works with the new password; create a shipment and track it; the DB survives a redeploy (/api/diag/storage); robots.txt/sitemap.xml are correct.
Commit "docs: deployment for new domain". STOP. After I confirm the database survives a redeploy, I'll ask you to remove /api/diag/storage.
```

---

## Utility prompts

### Prompt R: Resume in a new chat
```
Resume the re-launch of this logistics platform under its new name and domain. Read CLAUDE.md (§2 has the new facts), PROMPTS.md and docs/PROJECT_TRACKER.md, check `git status` and `git log --oneline -10`, then tell me which prompt we're on and what's next. Don't change anything until I confirm.
```

### Prompt F: Fix something that broke
```
Something broke: [what you see, which page, the steps, any error message].
Reproduce it, find the root cause (check the latest commits first) and explain it before fixing. Apply the smallest fix that doesn't change design or unrelated behaviour, confirm build + admin login + tracking still work, and commit "fix: …".
```

### Prompt O: Owner info arrived
```
New business information: [phone / WhatsApp / address / socials / replacement photos].
Add it to src/config/brand.ts (photos via scripts/optimize-images.mjs into Public/images/site/), check the related UI now shows it, remove it from "Blocked / Needs owner" in the tracker, build, and commit "content: add owner-supplied details".
```
