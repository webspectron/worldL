# Deployment: GitHub → Hostinger (World Vexa Logistics)

The app is **one Node.js process**. Express serves the API (`/api/*`) and the built React site (`dist/`), and keeps its
data in **one SQLite file**. The public site and the admin console are the **same app** answering on different
hostnames:

| Host | Serves |
|---|---|
| `https://worldvexalogistics.com` | Public site (canonical: `index.html`, `robots.txt` and `sitemap.xml` all use the apex) |
| `https://www.worldvexalogistics.com` | Same app; ideally a 301 redirect to the apex |
| `https://private.worldvexalogistics.com` | Admin console (`ADMIN_HOST` in `src/config/brand.ts`), same app, same API, same database |

The new host starts with a **fresh, empty database**. Nothing is migrated from the old site.

Hostinger's hPanel screens change from time to time. If a label below doesn't match, look for the equivalent setting.

---

## 1. Hosting requirements

| Need | Why |
|---|---|
| A Hostinger plan that runs **Node.js web apps** (Business / Cloud web hosting, or a VPS) | Static hosting can't run the Express server, tracking API or admin |
| **Node.js ≥ 22.5** (22.x LTS or newer) | `server/db.ts` uses the built-in `node:sqlite`; `package.json` has `"engines": { "node": ">=22.5" }` |
| **Persistent storage** outside the deploy folder | The database must survive every redeploy |
| HTTPS on all three hostnames | The admin session cookie is `secure` in production |
| Three hostnames on **one** app | Public site and admin share one API, session store and database |

## 2. GitHub: new repo with fresh history

Create an empty **private** repo on GitHub first (no README, no .gitignore, no licence), e.g. `world-vexa-logistics`.
With the GitHub CLI: `gh repo create <you>/world-vexa-logistics --private`.

Then, in the project folder (works in PowerShell and Git Bash; the one line that differs is marked):

```bash
# 0. Start clean and make sure the build passes
git status                      # must say "nothing to commit, working tree clean"
npm run build

# 1. Keep the old history as a LOCAL backup branch (never push it)
git branch archive/pre-launch main

# 2. New branch with no history, holding exactly the current files
git checkout --orphan fresh
git rm -r --cached --quiet screens CLAUDE.md PROMPTS.md   # files stay on disk, just not in the repo
Add-Content .gitignore "/screens/"                         # PowerShell
# echo "/screens/" >> .gitignore                           # Git Bash instead of the line above
git add .gitignore
git commit -m "World Vexa Logistics: initial import"
git branch -M main              # the fresh branch becomes main; the old history stays in archive/pre-launch

# 3. Point at the new repo and push main only
git remote remove origin
git remote add origin https://github.com/<you>/world-vexa-logistics.git
git push -u origin main

# 4. Check
git log --oneline               # exactly one commit
git ls-files | Select-String -Pattern "^\.env$|^data/|\.db$|^screens/"   # PowerShell: must print nothing
# git ls-files | grep -E "^\.env$|^data/|\.db$|^screens/"                # Git Bash equivalent
```

Why these files stay out: `screens/` is ~11 MB of old reference screenshots; `CLAUDE.md` and `PROMPTS.md` are already
listed in `.gitignore` (internal working notes). `.env`, `data/`, `node_modules/`, `dist/` and `dist-server/` are
ignored as before. `images/` (logo master and stock-photo originals with their `SOURCES.md`) stays in, since
`scripts/optimize-images.mjs` builds `Public/` from it.

> The current `origin` is `github.com/ojrandy/WVL`. If that is meant to be the new repo, only push to it if it is
> **empty**. If it already holds the old history, create a new repo instead (or delete and recreate it yourself).

From now on, work and push from this folder as usual: `git push` on `main` → Hostinger redeploys.

## 3. Hostinger hPanel checklist

### 3.1 Create the Node.js app
- [ ] hPanel → **Websites → Add website → Node.js app** (on some plans: *Advanced → Node.js*).
- [ ] Choose **Import Git repository**, authorise GitHub, pick `<you>/world-vexa-logistics`, branch **`main`**.
- [ ] Domain: **`worldvexalogistics.com`**.
- [ ] Settings:

| Setting | Value |
|---|---|
| Framework / preset | Express (or "Other") |
| Node version | **22.x** (or newer; never below 22.5) |
| Root directory | `/` (repo root) |
| Install command | `npm install` (its `postinstall` already runs `npm run build`) |
| Build command | `npm run build` only if the panel insists on one; otherwise leave empty so it doesn't build twice |
| Output directory | leave empty / not used (Express serves `dist/` itself) |
| Entry file / start command | `npm start` (= `node dist-server/server/index.js`) |
| Port | Don't hard-code. The server reads `process.env.PORT`, which Hostinger sets |

### 3.2 Environment variables (set in hPanel, never commit)

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the **new** admin password (see below) |
| `SESSION_SECRET` | 64 hex characters (see below) |
| `DB_PATH` | a `.db` file in a folder **outside** the app/deploy directory, e.g. `/home/<hostinger-user>/wvl-data/app.db` |
| `SEED_DEMO_DATA` | **unset** (it does nothing any more; demo data was removed) |
| `ADMIN_PROXY_TARGET` | **unset** (that mode is for a separate admin app; we use one app for all three hosts) |
| `PORT` | unset, unless the panel asks for it |

Generate the two secrets locally, in the project folder (PowerShell; the password is typed at a hidden prompt so it
never lands in a file or your shell history):

```powershell
$s = Read-Host "New admin password" -AsSecureString
$env:NEW_ADMIN_PW = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
node -e "console.log(require('bcryptjs').hashSync(process.env.NEW_ADMIN_PW, 12))"
Remove-Item Env:NEW_ADMIN_PW; Remove-Variable s

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the hash (starts with `$2b$12$`) **unquoted**. Use a fresh pair for production; never reuse your local `.env`
values. Changing the admin password later = new hash in hPanel + restart; no code change.

About `DB_PATH`: the server creates the folder and the file on first start. Find your home path in hPanel (File
Manager shows `/home/u123456789/…`). Pick a folder that is **not** under the app's own directory (e.g. not inside
`domains/worldvexalogistics.com/…`), because a git redeploy may replace that directory. If your plan offers a path
described as persistent storage, use that. §4 step 5 proves whether it survives.

- [ ] Save the variables, then **restart / redeploy** the app so it picks them up.
- [ ] Check the app log: it should print the World Vexa start-up banner and **no**
  `SESSION_SECRET is not set` error.

### 3.3 Domains: apex + www + admin subdomain on the SAME app
- [ ] `worldvexalogistics.com` attached to the Node app (done in 3.1).
- [ ] `www.worldvexalogistics.com`: attached to the same app, ideally as a **301 redirect to the apex** (the canonical
  URL, OG tags and sitemap all use the apex). If the panel can only serve both, that also works; the canonical tag
  covers it.
- [ ] `private.worldvexalogistics.com`: add it as an **additional domain / alias of the same Node app**, not a separate
  app and not a separate website. Both hostnames must reach the same process so they share one API, one session store
  and one database.
- [ ] DNS (if the domain uses Hostinger nameservers this is automatic; otherwise at your registrar): apex `A` record and
  `www` + `private` records pointing to what hPanel shows for the app. Wait for DNS (minutes to a few hours).

> **If hPanel won't attach `private.` to the same app:** stop and tell me before working around it. The code still has
> a fallback (a second app with `ADMIN_PROXY_TARGET` set, which forwards `/api` to the main app and has no database of
> its own), but it's a different setup from the one decided, so it needs your sign-off.

### 3.4 SSL and HTTPS
- [ ] hPanel → **Security → SSL**: install the free SSL certificate for **all three**: `worldvexalogistics.com`,
  `www.worldvexalogistics.com`, `private.worldvexalogistics.com`.
- [ ] Turn on **Force HTTPS** for the domain (and the subdomain, if it has its own toggle).
- [ ] Check: `http://worldvexalogistics.com` and `http://private.worldvexalogistics.com` both redirect to `https://`.

Login only works over HTTPS in production (secure cookie; the server already trusts Hostinger's proxy for this).

### 3.5 Email: info@worldvexalogistics.com
- [ ] hPanel → **Emails**: set up Hostinger Email for `worldvexalogistics.com` (or Google Workspace) and create the
  mailbox **`info@worldvexalogistics.com`**.
- [ ] DNS records (hPanel adds them automatically on Hostinger nameservers; check under **Emails → DNS / Connect
  domain**):
  - **MX**: the provider's MX records (Hostinger: `mx1.hostinger.com`, `mx2.hostinger.com`).
  - **SPF** (TXT on `@`): `v=spf1 include:_spf.mail.hostinger.com ~all` (Google Workspace: `include:_spf.google.com`).
    Only **one** SPF record per domain.
  - **DKIM**: the TXT/CNAME record the provider shows.
  - **DMARC** (TXT on `_dmarc`): `v=DMARC1; p=quarantine; rua=mailto:info@worldvexalogistics.com`
- [ ] Send a test mail from info@ to a Gmail address → open it → **Show original**: SPF, DKIM and DMARC all `PASS`.
- [ ] Reply from Gmail to info@ and confirm it arrives.

## 4. Post-deploy smoke test

Run in this order on the live domains. Use a private/incognito window for the browser checks.

**1. Site loads on the apex and www**
- [ ] `https://worldvexalogistics.com` loads Home, padlock shown, title "World Vexa Logistics", new logo, no console errors.
- [ ] `https://www.worldvexalogistics.com` redirects to the apex (or loads the same site).
- [ ] `https://worldvexalogistics.com/api/health` → `{"status":"ok","service":"World Vexa Logistics API",…}`.

**2. Admin opens ONLY on the admin subdomain**
- [ ] `https://worldvexalogistics.com/#/admin` → shows **Home**, not the admin login.
- [ ] `https://www.worldvexalogistics.com/#/admin` → also Home.
- [ ] `https://private.worldvexalogistics.com` → admin login, "WVL Operations Console".
- [ ] The admin host is hidden from search engines: in PowerShell
  `curl.exe -sI https://private.worldvexalogistics.com | Select-String X-Robots-Tag` → `X-Robots-Tag: noindex, nofollow`.

**3. Login with the new password**
- [ ] A wrong password is rejected.
- [ ] The new password logs in, and reloading the page keeps you logged in (proves the secure cookie works behind HTTPS).

**4. Create a shipment and track it**
- [ ] Admin → create a shipment → it gets an ID of exactly 8 characters: `WVL` + 5 (e.g. `WVL7K2M9`). Write it down.
- [ ] On `https://worldvexalogistics.com` → Track → enter the ID → the shipment shows (also in lower case).
- [ ] `WVL7K2M9` (the example ID from the help text) says **not found**: there is no demo data.
- [ ] Download one document (e.g. the label or invoice): new logo, "World Vexa Logistics", info@worldvexalogistics.com.

**5. The database survives a redeploy (`/api/diag/storage`)**

This endpoint is temporary and admin-only, so open it in the browser where you're logged in to `private.`:
- [ ] Open `https://private.worldvexalogistics.com/api/diag/storage`. Note `markerFirstSeen`. Check that `dataDir` is
  the folder from your `DB_PATH` and `databaseFileExists` is `true`.
- [ ] Redeploy: push a commit (`git commit --allow-empty -m "chore: redeploy test"` + `git push`) or use the panel's
  **Redeploy** button. Wait until it's live again.
- [ ] Log in again (sessions are in memory, so **every redeploy logs everyone out**; that is expected).
- [ ] Open `/api/diag/storage` again: **`markerFirstSeen` is unchanged** and `databaseFileSizeBytes` is not smaller.
- [ ] The shipment from step 4 still tracks on the public site.

If `markerFirstSeen` changed or the shipment is gone, the storage is **not** persistent: choose another `DB_PATH`
(outside the app folder) and repeat. Don't launch until this passes. Once it passes, tell me and I'll remove
`/api/diag/storage` in a separate commit.

**6. robots.txt and sitemap.xml**
- [ ] `https://worldvexalogistics.com/robots.txt` is exactly:
  ```
  User-agent: *
  Disallow: /api/

  Sitemap: https://worldvexalogistics.com/sitemap.xml
  ```
- [ ] `https://worldvexalogistics.com/sitemap.xml` lists one URL: `<loc>https://worldvexalogistics.com/</loc>`.
- [ ] `https://private.worldvexalogistics.com/robots.txt` is `User-agent: *` / `Disallow: /`, and
  `https://private.worldvexalogistics.com/sitemap.xml` returns 404.
- [ ] Neither file mentions `private.` or any old domain.

## 5. Launch checklist (after the smoke test passes)

- [ ] Quote request → appears in admin → the quote link opens publicly.
- [ ] Contact and callback forms submit; the contact form shows a `WVL-TKT-` reference.
- [ ] **OG image is live:** `https://worldvexalogistics.com/brand/og-image.jpg` returns 200 (`image/jpeg`). `index.html`
  points `og:image`, `twitter:image`, `og:url` and `canonical` at the apex, so if you ever serve the site on `www.`
  instead, update all four first. Then run the home URL through the Facebook Sharing Debugger and LinkedIn Post
  Inspector ("Scrape again").
- [ ] View source + `robots.txt` + `sitemap.xml` + link preview (paste the link in WhatsApp): World Vexa only.
- [ ] Final old-brand sweep on the live HTML/JS bundle (REBRAND_MAP §7).
- [ ] Lighthouse mobile on Home meets the MOTION_3D_SPEC §2 targets.
- [ ] Phone, WhatsApp, address and social links stay hidden until the owner supplies them.

## 6. After launch

- **Backups:** the database runs in WAL mode, so copy it with SQLite's own snapshot rather than copying `app.db` alone.
  A daily Hostinger cron job (hPanel → Advanced → Cron Jobs), with your real paths:
  ```bash
  node -e "const{DatabaseSync}=require('node:sqlite');new DatabaseSync(process.argv[1]).exec(\"VACUUM INTO '\"+process.argv[2]+\"'\")" /home/<user>/wvl-data/app.db /home/<user>/wvl-backups/app-$(date +\%F).db
  ```
  Download a copy off the server regularly and test a restore once (stop the app, put the copy at `DB_PATH`, start).
- **Updates:** push to `main` → Hostinger redeploys (and logs admins out). Use a `staging` branch/subdomain for bigger
  changes.
- **Monitoring:** a free uptime monitor on `https://worldvexalogistics.com/api/health` (5-minute interval) with alerts
  to info@worldvexalogistics.com.
- **Security:** rotate `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` if anyone with access leaves; `npm audit` monthly.
