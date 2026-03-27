# ProgramPilot — Change Log

---

## [Done] Visual Shift Blocks + Bug Fixes
**Status:** Working — shifts save, display as colored blocks, resize and move

### What Changed
- `client/src/pages/Schedule.tsx` — full rewrite of shift rendering: full-width colored blocks (AM=teal, PM=purple, Full Day=navy), proportional block height, bold time display, location, duration label, resize handle at bottom, drag-to-move via HTML5 drag API, staff total hours under name, + button always visible per cell
- `server/src/routes/shifts.ts` — PUT handler now accepts `staffId` (drag-to-move was silently broken), switched to spread pattern so partial updates (resize, move) never wipe unrelated fields

### Bugs Fixed
- **Resize not saving** — `mouseup` handler captured stale `null` from closure; fixed with `resizePreviewRef`
- **Drag-to-move not updating staff** — `staffId` was missing from PUT handler destructure
- **Shifts on wrong day** — `isSameDay(parseISO(utcMidnight), localDay)` was off by 1 day in US timezones; fixed with direct string comparison `shift.date.slice(0,10)`
- **Notes wiped on resize** — `undefined || null` was overwriting existing notes on partial updates

---

## [Done] Staff × Day Scheduler Grid
**Status:** Working — week / 2-week / month views, add/edit/delete shifts

### Files Modified
- `server/prisma/schema.prisma` — added `Shift` model (staffId, cityId, date, startTime, endTime, location, sessionType, notes); added `shifts` relation to Staff and City
- `server/src/routes/shifts.ts` — **new file**, CRUD endpoints: `GET /shifts?start=&end=`, `POST /shifts`, `PUT /shifts/:id`, `DELETE /shifts/:id`
- `server/src/index.ts` — registered `/api/shifts` route
- `client/src/pages/Schedule.tsx` — complete rewrite: staff rows × date columns grid, ShiftBlock component, ShiftModal (add/edit/delete), week/2-week/month view toggle, prev/next/today navigation
- `client/src/types/index.ts` — added `Shift` interface

### Database
- `Shift` table created via `prisma db push` (now automatic via DIRECT_URL)

---

## [Done] Migration Automation
**Status:** Working — `prisma db push` completes in ~3 seconds

### What Changed
- `server/.env` — added `DIRECT_URL` (session pooler port 5432); this is the non-pgBouncer connection Prisma needs for schema introspection
- `server/prisma/schema.prisma` — added `directUrl = env("DIRECT_URL")` to datasource block
- Migrations now run automatically; no more manual SQL in Supabase SQL Editor for schema changes

---

## [Done] Google OAuth + Supabase Auth
**Status:** Working — Google login and email/password both functional

### Files Modified
- `server/prisma/schema.prisma` — made `password` optional, added `supabaseId String? @unique` to User model
- `server/src/middleware/auth.ts` — replaced custom JWT verify with `supabase.auth.getUser(token)`
- `server/src/routes/auth.ts` — removed `/login` endpoint, added `/sync` (upsert user on first OAuth login), updated `/me` to look up by `supabaseId`
- `server/.env` — replaced `JWT_SECRET` / `SUPABASE_JWT_SECRET` with `SUPABASE_URL` + `SUPABASE_ANON_KEY`; added `?pgbouncer=true` to DATABASE_URL
- `client/src/hooks/useAuth.ts` — replaced axios-based auth with Supabase Auth (email + Google OAuth)
- `client/src/pages/Login.tsx` — added Google sign-in button
- `client/src/lib/supabase.ts` — **new file**, Supabase client singleton
- `client/.env` — **new file**, `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `client/postcss.config.js` — changed `export default` to `module.exports` (CJS fix)
- `client/package.json` — added `@supabase/supabase-js`
- `server/package.json` — added `@supabase/supabase-js`

### How to Revert Auth to Email/Password Only
1. Restore `server/src/middleware/auth.ts` to use `jwt.verify(token, process.env.JWT_SECRET!)`
2. Restore `server/src/routes/auth.ts` to original `/login` + `/me` endpoints
3. Restore `client/src/hooks/useAuth.ts` to axios-based login
4. Remove Google button from `client/src/pages/Login.tsx`
5. Remove `client/src/lib/supabase.ts`
6. Remove `@supabase/supabase-js` from both package.json files

---

## [Done] Initial Scaffold
- Full project scaffolded: React 18 + TypeScript + Vite + Tailwind (client), Node + Express + Prisma (server)
- Committed and pushed to `git@github.com:dcatan89/program-pilot.git`

---

## [Done] Infrastructure
- Supabase project created: `hypnrzwngksrlbyehttz`
- Connection pooler URL configured in `server/.env`
- Google Cloud OAuth credentials created (Client ID + Secret added to Supabase)
